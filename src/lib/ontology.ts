import { prisma } from "@/lib/prisma";
import { callLLM } from "./graphrag";

// ===================== 类型定义 =====================
export interface OntologyDefinition {
  objectTypes: OntologyObjectTypeDef[];
  linkTypes: OntologyLinkTypeDef[];
  properties: OntologyPropertyDef[];
  rules: OntologyRuleDef[];
}

export interface OntologyObjectTypeDef {
  name: string;
  label?: string;
  description?: string;
  properties?: OntologyPropertyDef[];
  parentType?: string;
  color?: string;
  icon?: string;
}

export interface OntologyLinkTypeDef {
  name: string;
  label?: string;
  description?: string;
  sourceType: string;
  targetType: string;
  properties?: OntologyPropertyDef[];
  cardinality?: string;
}

export interface OntologyPropertyDef {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface OntologyRuleDef {
  name: string;
  description?: string;
  ruleType: string;
  config: Record<string, unknown>;
}

export interface ExtractedInstance {
  name: string;
  type: string;
  properties: Record<string, unknown>;
  confidence?: number;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  linkType: string;
  properties?: Record<string, unknown>;
}

export interface ExtractResult {
  instances: ExtractedInstance[];
  relations: ExtractedRelation[];
}

export interface QueryResult {
  answer: string;
  instances: unknown[];
  relations: unknown[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface OntologyStats {
  schemaCount: number;
  typeCount: number;
  instanceCount: number;
  relationCount: number;
}

// ===================== OWL / RDF 解析辅助 =====================

function parseOWLXml(owlContent: string): OntologyDefinition {
  const def: OntologyDefinition = { objectTypes: [], linkTypes: [], properties: [], rules: [] };

  // 提取 owl:Class
  const classRegex = /<owl:Class\s+rdf:about="([^"]+)"[^>]*>([\s\S]*?)<\/owl:Class>/g;
  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(owlContent)) !== null) {
    const uri = match[1];
    const name = uri.split("#").pop() || uri.split("/").pop() || "Class";
    const body = match[2];
    const labelMatch = body.match(/<rdfs:label>([^<]*)<\/rdfs:label>/);
    const commentMatch = body.match(/<rdfs:comment>([^<]*)<\/rdfs:comment>/);
    def.objectTypes.push({
      name,
      label: labelMatch?.[1] || name,
      description: commentMatch?.[1] || "",
      properties: [],
    });
  }

  // 提取 owl:ObjectProperty
  const propRegex = /<owl:ObjectProperty\s+rdf:about="([^"]+)"[^>]*>([\s\S]*?)<\/owl:ObjectProperty>/g;
  while ((match = propRegex.exec(owlContent)) !== null) {
    const uri = match[1];
    const name = uri.split("#").pop() || uri.split("/").pop() || "Property";
    const body = match[2];
    const domainMatch = body.match(/<rdfs:domain\s+rdf:resource="([^"]+)"\s*\/>/);
    const rangeMatch = body.match(/<rdfs:range\s+rdf:resource="([^"]+)"\s*\/>/);
    const labelMatch = body.match(/<rdfs:label>([^<]*)<\/rdfs:label>/);
    const sourceType = domainMatch?.[1].split("#").pop() || "Thing";
    const targetType = rangeMatch?.[1].split("#").pop() || "Thing";
    def.linkTypes.push({
      name,
      label: labelMatch?.[1] || name,
      sourceType,
      targetType,
      cardinality: "many-to-many",
    });
  }

  // 提取 owl:DatatypeProperty
  const dataPropRegex = /<owl:DatatypeProperty\s+rdf:about="([^"]+)"[^>]*>([\s\S]*?)<\/owl:DatatypeProperty>/g;
  while ((match = dataPropRegex.exec(owlContent)) !== null) {
    const uri = match[1];
    const name = uri.split("#").pop() || uri.split("/").pop() || "Property";
    const body = match[2];
    const domainMatch = body.match(/<rdfs:domain\s+rdf:resource="([^"]+)"\s*\/>/);
    const rangeMatch = body.match(/<rdfs:range\s+rdf:resource="([^"]+)"\s*\/>/);
    const typeMap: Record<string, string> = {
      "http://www.w3.org/2001/XMLSchema#string": "string",
      "http://www.w3.org/2001/XMLSchema#integer": "number",
      "http://www.w3.org/2001/XMLSchema#decimal": "number",
      "http://www.w3.org/2001/XMLSchema#boolean": "boolean",
      "http://www.w3.org/2001/XMLSchema#dateTime": "date",
    };
    const propType = typeMap[rangeMatch?.[1] || ""] || "string";
    def.properties.push({
      name,
      type: propType as OntologyPropertyDef["type"],
      description: domainMatch?.[1] || "",
    });
  }

  return def;
}

function parseOWLTurtle(turtleContent: string): OntologyDefinition {
  const def: OntologyDefinition = { objectTypes: [], linkTypes: [], properties: [], rules: [] };
  const lines = turtleContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed) continue;

    // Class declaration: :Person a owl:Class ; rdfs:label "Person" .
    const classMatch = trimmed.match(/:?(\w+)\s+a\s+owl:Class/);
    if (classMatch) {
      const name = classMatch[1];
      const labelMatch = trimmed.match(/rdfs:label\s+"([^"]+)"/);
      const commentMatch = trimmed.match(/rdfs:comment\s+"([^"]+)"/);
      def.objectTypes.push({
        name,
        label: labelMatch?.[1] || name,
        description: commentMatch?.[1] || "",
        properties: [],
      });
      continue;
    }

    // ObjectProperty: :worksFor a owl:ObjectProperty ; rdfs:domain :Person ; rdfs:range :Organization .
    const objPropMatch = trimmed.match(/:?(\w+)\s+a\s+owl:ObjectProperty/);
    if (objPropMatch) {
      const name = objPropMatch[1];
      const domainMatch = trimmed.match(/rdfs:domain\s+:?(\w+)/);
      const rangeMatch = trimmed.match(/rdfs:range\s+:?(\w+)/);
      const labelMatch = trimmed.match(/rdfs:label\s+"([^"]+)"/);
      def.linkTypes.push({
        name,
        label: labelMatch?.[1] || name,
        sourceType: domainMatch?.[1] || "Thing",
        targetType: rangeMatch?.[1] || "Thing",
        cardinality: "many-to-many",
      });
      continue;
    }

    // DatatypeProperty: :hasAge a owl:DatatypeProperty ; rdfs:domain :Person ; rdfs:range xsd:integer .
    const dataPropMatch = trimmed.match(/:?(\w+)\s+a\s+owl:DatatypeProperty/);
    if (dataPropMatch) {
      const name = dataPropMatch[1];
      const rangeMatch = trimmed.match(/rdfs:range\s+xsd:(\w+)/);
      const typeMap: Record<string, string> = {
        string: "string",
        integer: "number",
        decimal: "number",
        boolean: "boolean",
        dateTime: "date",
      };
      const propType = typeMap[rangeMatch?.[1] || ""] || "string";
      def.properties.push({
        name,
        type: propType as OntologyPropertyDef["type"],
      });
    }
  }

  return def;
}

function guessOWLSyntax(content: string): "xml" | "turtle" {
  if (content.trim().startsWith("<?xml") || content.includes("<owl:Ontology")) return "xml";
  if (content.includes("@prefix") || content.includes("a owl:Class")) return "turtle";
  if (content.includes("<") && content.includes("</owl:")) return "xml";
  return "turtle";
}

// ===================== OntologyEngine =====================

export class OntologyEngine {
  // ---------- Schema 管理 ----------

  async createSchema(
    name: string,
    description: string,
    definition: OntologyDefinition
  ): Promise<{ id: string }> {
    const schema = await prisma.ontologySchema.create({
      data: {
        name,
        description,
        version: "1.0",
        definition: JSON.stringify(definition),
        status: "active",
      },
    });

    // 自动拆分 objectTypes
    if (definition.objectTypes?.length) {
      await prisma.ontologyObjectType.createMany({
        data: definition.objectTypes.map((ot) => ({
          schemaId: schema.id,
          name: ot.name,
          label: ot.label || ot.name,
          description: ot.description || "",
          properties: JSON.stringify(ot.properties || []),
          parentType: ot.parentType || null,
          color: ot.color || "#6366f1",
          icon: ot.icon || "📦",
        })),
      });
    }

    // 自动拆分 linkTypes
    if (definition.linkTypes?.length) {
      await prisma.ontologyLinkType.createMany({
        data: definition.linkTypes.map((lt) => ({
          schemaId: schema.id,
          name: lt.name,
          label: lt.label || lt.name,
          description: lt.description || "",
          sourceType: lt.sourceType,
          targetType: lt.targetType,
          properties: JSON.stringify(lt.properties || []),
          cardinality: lt.cardinality || "many-to-many",
        })),
      });
    }

    // 自动拆分 rules
    if (definition.rules?.length) {
      await prisma.ontologyRule.createMany({
        data: definition.rules.map((r) => ({
          schemaId: schema.id,
          name: r.name,
          description: r.description || "",
          ruleType: r.ruleType || "custom",
          config: JSON.stringify(r.config || {}),
          isActive: true,
        })),
      });
    }

    return { id: schema.id };
  }

  async updateSchema(
    id: string,
    updates: Partial<{ name: string; description: string; definition: OntologyDefinition; status: string }>
  ): Promise<void> {
    const schema = await prisma.ontologySchema.findUnique({ where: { id } });
    if (!schema) throw new Error(`Schema ${id} not found`);

    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.definition !== undefined) {
      data.definition = JSON.stringify(updates.definition);
      data.version = String(Number(schema.version) + 0.1);

      // 清除旧子表数据并重新创建
      await prisma.ontologyObjectType.deleteMany({ where: { schemaId: id } });
      await prisma.ontologyLinkType.deleteMany({ where: { schemaId: id } });
      await prisma.ontologyRule.deleteMany({ where: { schemaId: id } });

      const def = updates.definition;
      if (def.objectTypes?.length) {
        await prisma.ontologyObjectType.createMany({
          data: def.objectTypes.map((ot) => ({
            schemaId: id,
            name: ot.name,
            label: ot.label || ot.name,
            description: ot.description || "",
            properties: JSON.stringify(ot.properties || []),
            parentType: ot.parentType || null,
            color: ot.color || "#6366f1",
            icon: ot.icon || "📦",
          })),
        });
      }
      if (def.linkTypes?.length) {
        await prisma.ontologyLinkType.createMany({
          data: def.linkTypes.map((lt) => ({
            schemaId: id,
            name: lt.name,
            label: lt.label || lt.name,
            description: lt.description || "",
            sourceType: lt.sourceType,
            targetType: lt.targetType,
            properties: JSON.stringify(lt.properties || []),
            cardinality: lt.cardinality || "many-to-many",
          })),
        });
      }
      if (def.rules?.length) {
        await prisma.ontologyRule.createMany({
          data: def.rules.map((r) => ({
            schemaId: id,
            name: r.name,
            description: r.description || "",
            ruleType: r.ruleType || "custom",
            config: JSON.stringify(r.config || {}),
            isActive: true,
          })),
        });
      }
    }

    await prisma.ontologySchema.update({ where: { id }, data });
  }

  async getSchema(id: string): Promise<unknown | null> {
    const schema = await prisma.ontologySchema.findUnique({
      where: { id },
      include: {
        objectTypes: true,
        linkTypes: true,
        rules: true,
      },
    });
    if (!schema) return null;
    return {
      ...schema,
      definition: this.safeJsonParse(schema.definition, {}),
      objectTypes: schema.objectTypes.map((ot) => ({
        ...ot,
        properties: this.safeJsonParse(ot.properties, []),
      })),
      linkTypes: schema.linkTypes.map((lt) => ({
        ...lt,
        properties: this.safeJsonParse(lt.properties, []),
      })),
      rules: schema.rules.map((r) => ({
        ...r,
        config: this.safeJsonParse(r.config, {}),
      })),
    };
  }

  async listSchemas(): Promise<unknown[]> {
    const schemas = await prisma.ontologySchema.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        objectTypes: { select: { id: true, name: true } },
        linkTypes: { select: { id: true, name: true } },
      },
    });
    return schemas.map((s) => ({
      ...s,
      definition: this.safeJsonParse(s.definition, {}),
      objectTypeCount: s.objectTypes.length,
      linkTypeCount: s.linkTypes.length,
    }));
  }

  async deleteSchema(id: string): Promise<void> {
    await prisma.ontologySchema.delete({ where: { id } });
  }

  // ---------- Ontology-driven 实体抽取 ----------

  async extractWithOntology(text: string, schemaId: string): Promise<ExtractResult> {
    const schema = await this.getSchema(schemaId);
    if (!schema) throw new Error(`Schema ${schemaId} not found`);

    const objectTypes = (schema as Record<string, unknown>).objectTypes as Array<Record<string, unknown>>;
    const typeDescriptions = objectTypes
      .map((ot) => {
        const props = (ot.properties as OntologyPropertyDef[]) || [];
        const propDesc = props.map((p) => `${p.name}(${p.type}${p.required ? ",required" : ""})`).join(", ");
        return `${ot.name}(${propDesc})`;
      })
      .join(", ");

    const extractPrompt = `从以下文本中抽取实体，严格按 ontology 定义的类型输出。

类型定义：${typeDescriptions}

要求：
1. 每个实体必须属于上述类型之一
2. 返回严格的 JSON 格式，不要任何其他文字
3. JSON 格式如下：
{
  "instances": [
    {"name": "实体名", "type": "类型名", "properties": {"属性名": "值"}, "confidence": 0.95}
  ],
  "relations": [
    {"source": "源实体名", "target": "目标实体名", "linkType": "关系类型名", "properties": {}}
  ]
}

文本：
"""
${text}
"""

请只返回 JSON，不要任何解释或 markdown 格式。`;

    const raw = await callLLM(
      [
        {
          role: "system",
          content: "你是一个本体论驱动的实体抽取专家。只返回严格的 JSON 格式数据。",
        },
        { role: "user", content: extractPrompt },
      ],
      { temperature: 0.2, max_tokens: 4096 }
    );

    const result = this.parseExtractResult(raw);

    // 保存实例到数据库
    const savedInstances: Array<{ id: string; name: string; type: string }> = [];
    const instanceNameMap = new Map<string, string>(); // name -> db id

    for (const inst of result.instances) {
      const typeDef = objectTypes.find((ot) => ot.name === inst.type);
      if (!typeDef) continue;

      const existing = await prisma.ontologyInstance.findFirst({
        where: { schemaId, name: inst.name, typeId: typeDef.id as string },
      });

      if (existing) {
        await prisma.ontologyInstance.update({
          where: { id: existing.id },
          data: {
            properties: JSON.stringify(inst.properties || {}),
            confidence: inst.confidence ?? 1.0,
          },
        });
        savedInstances.push({ id: existing.id, name: inst.name, type: inst.type });
        instanceNameMap.set(inst.name, existing.id);
      } else {
        const created = await prisma.ontologyInstance.create({
          data: {
            schemaId,
            typeId: typeDef.id as string,
            name: inst.name,
            properties: JSON.stringify(inst.properties || {}),
            confidence: inst.confidence ?? 1.0,
          },
        });
        savedInstances.push({ id: created.id, name: inst.name, type: inst.type });
        instanceNameMap.set(inst.name, created.id);
      }
    }

    // 保存关系到数据库
    const savedRelations: Array<{ id: string; source: string; target: string }> = [];
    const linkTypes = (schema as Record<string, unknown>).linkTypes as Array<Record<string, unknown>>;

    for (const rel of result.relations) {
      const sourceId = instanceNameMap.get(rel.source);
      const targetId = instanceNameMap.get(rel.target);
      if (!sourceId || !targetId) continue;

      const linkTypeDef = linkTypes.find((lt) => lt.name === rel.linkType);
      if (!linkTypeDef) continue; // 跳过未定义关系类型的关系
      const linkTypeId: string = linkTypeDef.id as string;

      const existing = await prisma.ontologyRelation.findFirst({
        where: { schemaId, sourceId, targetId, linkTypeId },
      });

      if (existing) {
        await prisma.ontologyRelation.update({
          where: { id: existing.id },
          data: {
            properties: JSON.stringify(rel.properties || {}),
            isCurrent: true,
          },
        });
        savedRelations.push({ id: existing.id, source: rel.source, target: rel.target });
      } else {
        const created = await prisma.ontologyRelation.create({
          data: {
            schemaId,
            linkTypeId: linkTypeId!,
            sourceId,
            targetId,
            properties: JSON.stringify(rel.properties || {}),
            isCurrent: true,
          },
        });
        savedRelations.push({ id: created.id, source: rel.source, target: rel.target });
      }
    }

    return { instances: result.instances, relations: result.relations };
  }

  private parseExtractResult(raw: string): ExtractResult {
    let cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.instances && parsed.relations) return parsed;
    } catch {
      // continue
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (parsed.instances && parsed.relations) return parsed;
      } catch {
        // continue
      }
    }

    let fixed = cleaned
      .replace(/,\s*]/g, "]")
      .replace(/,\s*}/g, "}")
      .replace(/}\s*{/g, "},{")
      .replace(/]\s*\[/g, "],[");

    try {
      const parsed = JSON.parse(fixed);
      if (parsed.instances && parsed.relations) return parsed;
    } catch {
      // final fallback
    }

    console.error("无法解析 LLM 返回的 JSON:", cleaned.slice(0, 200));
    return { instances: [], relations: [] };
  }

  // ---------- Ontology-aware 查询 ----------

  async queryWithOntology(
    question: string,
    schemaId: string,
    mode: "type_filter" | "relation_traverse" | "hybrid" | "temporal"
  ): Promise<QueryResult> {
    const schema = await this.getSchema(schemaId);
    if (!schema) throw new Error(`Schema ${schemaId} not found`);

    const objectTypes = (schema as Record<string, unknown>).objectTypes as Array<Record<string, unknown>>;
    const linkTypes = (schema as Record<string, unknown>).linkTypes as Array<Record<string, unknown>>;

    let instances: unknown[] = [];
    let relations: unknown[] = [];
    let answer = "";

    switch (mode) {
      case "type_filter": {
        const typeName = this.extractTypeFromQuestion(question, objectTypes);
        if (typeName) {
          const typeDef = objectTypes.find((ot) => ot.name === typeName || ot.label === typeName);
          if (typeDef) {
            const found = await prisma.ontologyInstance.findMany({
              where: { schemaId, typeId: typeDef.id as string },
              include: { type: true },
            });
            instances = found.map((i) => ({
              ...i,
              properties: this.safeJsonParse(i.properties, {}),
              typeName: i.type.name,
            }));
            answer = `找到 ${found.length} 个 ${typeName} 类型的实例。`;
          } else {
            answer = `未在 schema 中找到类型 "${typeName}"。`;
          }
        } else {
          answer = "无法从问题中提取类型名。请使用类似'所有 Person'的格式。";
        }
        break;
      }

      case "relation_traverse": {
        const relName = this.extractRelationFromQuestion(question, linkTypes);
        if (relName) {
          const linkTypeDef = linkTypes.find(
            (lt) => lt.name === relName || lt.label === relName
          );
          if (linkTypeDef) {
            const found = await prisma.ontologyRelation.findMany({
              where: { schemaId, linkTypeId: linkTypeDef.id as string },
              include: { sourceInstance: { include: { type: true } }, targetInstance: { include: { type: true } } },
            });
            relations = found.map((r) => ({
              ...r,
              properties: this.safeJsonParse(r.properties, {}),
              sourceName: r.sourceInstance.name,
              sourceType: r.sourceInstance.type.name,
              targetName: r.targetInstance.name,
              targetType: r.targetInstance.type.name,
            }));
            answer = `找到 ${found.length} 条 ${relName} 关系。`;
          } else {
            answer = `未在 schema 中找到关系 "${relName}"。`;
          }
        } else {
          answer = "无法从问题中提取关系名。请使用类似'Person worksFor Organization'的格式。";
        }
        break;
      }

      case "hybrid": {
        // 先 type_filter 缩小范围
        const typeName = this.extractTypeFromQuestion(question, objectTypes);
        let typeIds: string[] = [];
        if (typeName) {
          const typeDef = objectTypes.find((ot) => ot.name === typeName || ot.label === typeName);
          if (typeDef) {
            typeIds = [typeDef.id as string];
            const foundInstances = await prisma.ontologyInstance.findMany({
              where: { schemaId, typeId: typeDef.id as string },
              include: { type: true },
            });
            instances = foundInstances.map((i) => ({
              ...i,
              properties: this.safeJsonParse(i.properties, {}),
              typeName: i.type.name,
            }));
          }
        }

        // 再 relation_traverse
        const relName = this.extractRelationFromQuestion(question, linkTypes);
        if (relName) {
          const linkTypeDef = linkTypes.find(
            (lt) => lt.name === relName || lt.label === relName
          );
          if (linkTypeDef) {
            const where: Record<string, unknown> = { schemaId, linkTypeId: linkTypeDef.id as string };
            if (typeIds.length > 0) {
              where.sourceInstance = { typeId: { in: typeIds } };
            }
            const foundRelations = await prisma.ontologyRelation.findMany({
              where,
              include: { sourceInstance: { include: { type: true } }, targetInstance: { include: { type: true } } },
            });
            relations = foundRelations.map((r) => ({
              ...r,
              properties: this.safeJsonParse(r.properties, {}),
              sourceName: r.sourceInstance.name,
              sourceType: r.sourceInstance.type.name,
              targetName: r.targetInstance.name,
              targetType: r.targetInstance.type.name,
            }));
            answer = `找到 ${instances.length} 个实例和 ${relations.length} 条 ${relName} 关系。`;
          } else {
            answer = `找到 ${instances.length} 个实例，但未找到关系 "${relName}"。`;
          }
        } else {
          answer = `找到 ${instances.length} 个实例。未识别出具体关系。`;
        }
        break;
      }

      case "temporal": {
        const yearMatch = question.match(/(\d{4})/);
        const year = yearMatch ? Number(yearMatch[1]) : null;
        if (year) {
          const startOfYear = new Date(year, 0, 1);
          const endOfYear = new Date(year, 11, 31, 23, 59, 59);
          const found = await prisma.ontologyRelation.findMany({
            where: {
              schemaId,
              validFrom: { gte: startOfYear },
              validTo: { lte: endOfYear },
            },
            include: { sourceInstance: { include: { type: true } }, targetInstance: { include: { type: true } }, linkType: true },
          });
          relations = found.map((r) => ({
            ...r,
            properties: this.safeJsonParse(r.properties, {}),
            sourceName: r.sourceInstance.name,
            sourceType: r.sourceInstance.type.name,
            targetName: r.targetInstance.name,
            targetType: r.targetInstance.type.name,
            linkTypeName: r.linkType.name,
          }));
          answer = `找到 ${found.length} 条 ${year} 年有效的时间关系。`;
        } else {
          answer = "未从问题中提取到年份。请使用类似'2023年的 CEO'的格式。";
        }
        break;
      }
    }

    return { answer, instances, relations };
  }

  private extractTypeFromQuestion(
    question: string,
    objectTypes: Array<Record<string, unknown>>
  ): string | null {
    for (const ot of objectTypes) {
      const name = ot.name as string;
      const label = (ot.label as string) || "";
      if (question.includes(name) || question.includes(label)) return name;
    }
    // 常见类型兜底
    const commonTypes = ["Person", "Organization", "Location", "Event", "Product", "Concept"];
    for (const t of commonTypes) {
      if (question.toLowerCase().includes(t.toLowerCase())) return t;
    }
    return null;
  }

  private extractRelationFromQuestion(
    question: string,
    linkTypes: Array<Record<string, unknown>>
  ): string | null {
    for (const lt of linkTypes) {
      const name = lt.name as string;
      const label = (lt.label as string) || "";
      if (question.includes(name) || question.includes(label)) return name;
    }
    // 常见关系兜底
    const commonRels = ["worksFor", "manages", "owns", "locatedIn", "partOf", "createdBy", "reportsTo"];
    for (const r of commonRels) {
      if (question.toLowerCase().includes(r.toLowerCase())) return r;
    }
    return null;
  }

  // ---------- 验证 ----------

  async validateInstance(
    instance: Record<string, unknown>,
    typeName: string,
    schemaId: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const typeDef = await prisma.ontologyObjectType.findFirst({
      where: { schemaId, name: typeName },
    });
    if (!typeDef) {
      errors.push({ field: "type", message: `类型 "${typeName}" 在 schema 中不存在`, severity: "error" });
      return errors;
    }

    const properties = this.safeJsonParse(typeDef.properties, []) as OntologyPropertyDef[];
    const props = (instance.properties || instance) as Record<string, unknown>;

    for (const prop of properties) {
      const value = props[prop.name];

      // 检查必填
      if (prop.required && (value === undefined || value === null || value === "")) {
        errors.push({
          field: prop.name,
          message: `必填属性 "${prop.name}" 缺失`,
          severity: "error",
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // 检查类型
      const actualType = typeof value;
      switch (prop.type) {
        case "string":
          if (actualType !== "string") {
            errors.push({
              field: prop.name,
              message: `属性 "${prop.name}" 应为 string，实际为 ${actualType}`,
              severity: "error",
            });
          }
          break;
        case "number":
          if (actualType !== "number") {
            errors.push({
              field: prop.name,
              message: `属性 "${prop.name}" 应为 number，实际为 ${actualType}`,
              severity: "error",
            });
          }
          break;
        case "boolean":
          if (actualType !== "boolean") {
            errors.push({
              field: prop.name,
              message: `属性 "${prop.name}" 应为 boolean，实际为 ${actualType}`,
              severity: "error",
            });
          }
          break;
        case "date": {
          const d = new Date(String(value));
          if (isNaN(d.getTime())) {
            errors.push({
              field: prop.name,
              message: `属性 "${prop.name}" 应为有效的日期格式`,
              severity: "error",
            });
          }
          break;
        }
      }
    }

    // 检查关系 cardinality（如果实例已有 id）
    if (instance.id) {
      const linkTypes = await prisma.ontologyLinkType.findMany({
        where: { schemaId },
      });
      for (const lt of linkTypes) {
        if (lt.cardinality === "one-to-one") {
          const count = await prisma.ontologyRelation.count({
            where: {
              schemaId,
              linkTypeId: lt.id,
              OR: [{ sourceId: instance.id as string }, { targetId: instance.id as string }],
            },
          });
          if (count > 1) {
            errors.push({
              field: lt.name,
              message: `关系 "${lt.name}" 为 one-to-one，但已有 ${count} 条关系`,
              severity: "error",
            });
          }
        }
      }
    }

    return errors;
  }

  // ---------- 导入/导出 ----------

  async importFromOWL(owlContent: string): Promise<{ schemaId: string }> {
    const syntax = guessOWLSyntax(owlContent);
    const def = syntax === "xml" ? parseOWLXml(owlContent) : parseOWLTurtle(owlContent);

    const schema = await this.createSchema(
      `Imported_${Date.now()}`,
      `从 OWL 导入的本体，语法: ${syntax}`,
      def
    );

    return { schemaId: schema.id };
  }

  async exportToRDF(schemaId: string): Promise<string> {
    const schema = await this.getSchema(schemaId);
    if (!schema) throw new Error(`Schema ${schemaId} not found`);

    const objectTypes = (schema as Record<string, unknown>).objectTypes as Array<Record<string, unknown>>;
    const linkTypes = (schema as Record<string, unknown>).linkTypes as Array<Record<string, unknown>>;
    const instances = await prisma.ontologyInstance.findMany({
      where: { schemaId },
      include: { type: true },
    });
    const relations = await prisma.ontologyRelation.findMany({
      where: { schemaId },
      include: { linkType: true, sourceInstance: true, targetInstance: true },
    });

    const lines: string[] = [
      "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .",
      "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
      "@prefix owl: <http://www.w3.org/2002/07/owl#> .",
      "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
      "@prefix bbg: <http://bloombloomgarden.org/ontology#> .",
      "",
      `bbg:schema_${schemaId} a owl:Ontology ;`,
      `  rdfs:label "${(schema as Record<string, unknown>).name}" .`,
      "",
    ];

    // Classes
    for (const ot of objectTypes) {
      lines.push(`bbg:${ot.name} a owl:Class ;`);
      lines.push(`  rdfs:label "${ot.label || ot.name}" .`);
      lines.push("");
    }

    // ObjectProperties
    for (const lt of linkTypes) {
      lines.push(`bbg:${lt.name} a owl:ObjectProperty ;`);
      lines.push(`  rdfs:label "${lt.label || lt.name}" ;`);
      lines.push(`  rdfs:domain bbg:${lt.sourceType} ;`);
      lines.push(`  rdfs:range bbg:${lt.targetType} .`);
      lines.push("");
    }

    // Instances
    for (const inst of instances) {
      lines.push(`bbg:instance_${inst.id} a bbg:${inst.type.name} ;`);
      lines.push(`  rdfs:label "${inst.name}" ;`);
      const props = this.safeJsonParse(inst.properties, {});
      for (const [key, value] of Object.entries(props)) {
        const escaped = String(value).replace(/"/g, '\\"');
        lines.push(`  bbg:${key} "${escaped}" ;`);
      }
      lines.push("  .");
      lines.push("");
    }

    // Relations
    for (const rel of relations) {
      lines.push(`bbg:relation_${rel.id} a owl:Axiom ;`);
      lines.push(`  bbg:${rel.linkType.name} bbg:instance_${rel.sourceId} ;`);
      lines.push(`  bbg:target bbg:instance_${rel.targetId} ;`);
      lines.push(`  rdfs:label "${rel.linkType.name}" .`);
      lines.push("");
    }

    return lines.join("\n");
  }

  // ---------- 统计 ----------

  async getStats(schemaId?: string): Promise<OntologyStats> {
    const where = schemaId ? { schemaId } : undefined;
    const [schemaCount, typeCount, instanceCount, relationCount] = await Promise.all([
      prisma.ontologySchema.count(),
      prisma.ontologyObjectType.count({ where }),
      prisma.ontologyInstance.count({ where }),
      prisma.ontologyRelation.count({ where }),
    ]);
    return { schemaCount, typeCount, instanceCount, relationCount };
  }

  // ---------- 辅助 ----------

  private safeJsonParse<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str) as T;
    } catch {
      return fallback;
    }
  }
}

// 导出单例
export const ontologyEngine = new OntologyEngine();

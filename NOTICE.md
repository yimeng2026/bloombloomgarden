# Open-source pattern and license notice

本项目在长文流水线中采用以下公开设计模式，未将第三方项目整体或大规模源码复制入库。

## LangChain — MIT

- `langchain-ai/langchain`：`libs/langchain/langchain_classic/chains/combine_documents/map_reduce.py`（读取 SHA `c7d9c62b09b9d059cbab7257dfbaf454d049a754`）。
- 同仓库 `reduce.py`（读取 SHA `df52740ce34965850f5b7402e0f049c774b7c96e`）。
- 采用点：分段映射、递归归并、按约束组织中间结果。
- 许可证：https://github.com/langchain-ai/langchain/blob/main/LICENSE （MIT，读取 SHA `3957738673765912ca83a0048f833e095d61e087`）。

## LangGraph — MIT

- `langchain-ai/langgraph`：`libs/checkpoint/README.md`（读取 SHA `a3e702b1ff81a6684c2ee8808fef3b1a5e84ade6`）。
- 采用点：持久检查点、线程/运行隔离、完成写入保留与失败恢复思想。
- 许可证：https://github.com/langchain-ai/langgraph/blob/main/LICENSE （MIT，读取 SHA `fc0602feecdd6748623c852ab534e1ca612673c7`）。

## Vercel AI SDK — Apache-2.0

- `vercel/ai`：`content/docs/08-migration-guides/29-migration-guide-4-0.mdx`（读取 SHA `b7222cd443c6bb58d1b29a45523899c073c0d972`）。
- 采用点：继续步骤与分段续写思路。
- 许可证：https://github.com/vercel/ai/blob/main/LICENSE （Apache-2.0，读取 SHA `6c16c29f41168411dbf6e3ba3a063ce789c27334`）。

本项目的实现按自身 Prisma/Next.js 数据模型、Kimi 网关和证据契约重写，不修改上游项目，也不冒称获得其认证或合作。

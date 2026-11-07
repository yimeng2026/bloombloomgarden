export interface LLMCompetitorContent {
  competitorId: string;
  content: string;
}

export interface LLMCompetitorScore {
  competitorId: string;
  name: string;
  score: number;
}

export interface CompetitorReference {
  id: string;
}

export interface RoundContentItem {
  [key: string]: unknown;
  competitorId?: string;
  reviewerId?: string;
  competitorA?: CompetitorReference;
  competitorB?: CompetitorReference;
  llmContent?: string;
  llmScore?: number;
  llmContentA?: string;
  llmScoreA?: number;
  llmContentB?: string;
  llmScoreB?: number;
}

export interface LLMCompetitorResponse {
  competitorId: string;
  content: string;
  score: number | null;
}

/** Merge model-generated content and valid scores into a round's structured content. */
export function enrichRoundContentWithLLM(
  roundContent: RoundContentItem[],
  llmContents: LLMCompetitorContent[] | null,
  llmScores: LLMCompetitorScore[] | null
): RoundContentItem[] {
  if (!llmContents || llmContents.length === 0) {
    return roundContent;
  }

  const enriched = roundContent.map((item): RoundContentItem => {
    const newItem: RoundContentItem = { ...item };
    const cid = item.competitorId ?? item.reviewerId;

    if (cid) {
      const llm = llmContents.find((entry) => entry.competitorId === cid);
      if (llm?.content) {
        newItem.llmContent = llm.content;
        const scoreEntry = llmScores?.find((entry) => entry.competitorId === cid);
        if (scoreEntry && scoreEntry.score >= 0) {
          newItem.llmScore = scoreEntry.score;
        }
      }
    }

    const compA = item.competitorA;
    const compB = item.competitorB;
    if (compA?.id) {
      const llmA = llmContents.find((entry) => entry.competitorId === compA.id);
      if (llmA?.content) {
        newItem.llmContentA = llmA.content;
        const scoreA = llmScores?.find((entry) => entry.competitorId === compA.id);
        if (scoreA && scoreA.score >= 0) {
          newItem.llmScoreA = scoreA.score;
        }
      }
    }

    if (compB?.id) {
      const llmB = llmContents.find((entry) => entry.competitorId === compB.id);
      if (llmB?.content) {
        newItem.llmContentB = llmB.content;
        const scoreB = llmScores?.find((entry) => entry.competitorId === compB.id);
        if (scoreB && scoreB.score >= 0) {
          newItem.llmScoreB = scoreB.score;
        }
      }
    }

    return newItem;
  });

  const competitorResponses: LLMCompetitorResponse[] = llmContents
    .filter((entry) => entry.content)
    .map((entry) => {
      const scoreEntry = llmScores?.find((score) => score.competitorId === entry.competitorId);
      return {
        competitorId: entry.competitorId,
        content: entry.content,
        score: scoreEntry && scoreEntry.score >= 0 ? scoreEntry.score : null,
      };
    });

  if (competitorResponses.length > 0) {
    enriched.push({
      type: "llm_competitor_responses",
      competitorResponses,
      timestamp: new Date().toISOString(),
    });
  }

  return enriched;
}

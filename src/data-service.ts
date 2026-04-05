import { WorkerEntrypoint } from "cloudflare:workers";
import { AI_SURVEY_DATA, type DeveloperAIRecord } from "./survey-data";

export { AI_SURVEY_DATA, type DeveloperAIRecord } from "./survey-data";

export class DataService extends WorkerEntrypoint {
  async getAIData(filters?: {
    region?: string;
    year?: 2024 | 2025;
    minRespondents?: number;
  }): Promise<DeveloperAIRecord[]> {
    let data = AI_SURVEY_DATA;

    if (filters?.region) {
      data = data.filter((r) => r.region === filters.region);
    }
    if (filters?.year) {
      data = data.filter((r) => r.year === filters.year);
    }
    if (filters?.minRespondents) {
      data = data.filter((r) => r.respondents >= filters.minRespondents!);
    }

    return data;
  }
}

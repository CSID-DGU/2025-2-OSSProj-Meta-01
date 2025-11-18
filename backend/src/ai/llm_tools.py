import os
from dotenv import load_dotenv
import openai
from openai import OpenAI
import json
from pydantic import BaseModel, Field
load_dotenv()

class LLMClassificationResponse(BaseModel):
    labels: list[str] = Field(description="장학금 공지사항을 분류하는 라벨 리스트")
    
class LLMSummaryResponse(BaseModel):
    신청기간: str = Field(description="장학금 신청 기간")
    마감일자: str = Field(description="장학금 마감 일자")
    신청방법: str = Field(description="장학금 신청 방법")
    신청대상: str = Field(description="장학금 신청 대상")
    신청기준: str = Field(description="장학금 신청 기준")
    혜택: str = Field(description="장학금 혜택")
    문의방법: str = Field(description="문의처 정보")
    
class LLMSummaryTool:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    def summarize_content(self, content):
        completion = self.client.beta.chat.completions.parse(
            model="gpt-4o-mini-2024-07-18",
            messages=[
                {"role": "system", "content": "당신은 장학금 공지사항을 요약하는 전문가입니다. 신청기간, 마감일자, 신청방법, 신청대상, 신청기준, 혜택, 문의방법을 추출하세요."},
                {"role": "user", "content": content}
            ],
            response_format=LLMSummaryResponse
        )
        return completion.choices[0].message.parsed.model_dump()
    
class LLMClassificationTool:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.classes = ["교내장학", "교외장학", "국가장학", "봉사", "성적우수", "등록금지원", "생활비지원", "이공계", "인문계", "예체능", "종교", "저소득층", "기업연계", "자격증"]
    
    def classify_content(self, content):
        system_prompt = f"당신은 장학금 공지사항을 분류하는 전문가입니다. 주어진 장학금 내용을 읽고, 반드시 해당하는 라벨을 부여하세요. 라벨은 다음 중 하나여야 합니다: {self.classes}"

        response = self.client.responses.parse(
            model="gpt-4.1-mini",
            temperature=0,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ],
            text_format=LLMClassificationResponse
        )
        return response.output_parsed
    
if __name__ == "__main__":
    llm_summary_tool = LLMSummaryTool()
    summary = llm_summary_tool.summarize_content("2026년 1학기 1차 국가근로장학금 학생신청기간 및 신청 방법을 아래와 같이 안내드립니다.□1차 신청 기간:2025. 11. 20.(목) 9시 ~ 2025. 12. 26.(금) 18시ㅇ 서류제출 및 가구원 동의: 2025. 11. 20.(목) 9시 ~ 2026. 1. 2.(금) 18시※ 주말 및 공휴일 포함 신청기간 내 24시간 신청가능(단, 마지막날은 18시 마감)□기타 안내사항ㅇ 학자금 지원구간이 산정된 이후 근로 가능하므로 가급적 빠른 신청 바랍니다. (장학금 신청일에 따라 학자금 지원구간 산정일정이 달라질 수 있음)ㅇ 국가근로장학금은 근로장학생의 근로 시간에 따라 장학금이 지급됩니다.ㅇ 2026년 하계방학 집중근로 프로그램에 참여하고자 하는 경우, 반드시 학생신청기간(1차 또는 2차)에 국가근로장학금을 신청해야 합니다.ㅇ 국가근로장학금은 소속대학이 확정된 학생만 신청할 수 있으며, 소속대학이 미정인 신(편)입생은 2차 학생신청기간을 이용하여 주시기 바랍니다.ㅇ 위 신청기간동안 2025년 2학기 봉사유형 및 취업연계유형 상시신청은 불가합니다.□문의사항 : 한국장학재단 상담센터 1599-2290")
    print(summary)
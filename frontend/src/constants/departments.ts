// src/constants/departments.ts
export const DEPARTMENT_MAP: Record<string, string[]> = {
  공과대학: [
    "산업시스템공학과",
    "전자전기공학부",
    "정보통신공학과",
    "건설환경공학과",
    "기계로봇에너지공학과",
    "건축공학부",
    "화공생물공학과",
    "컴퓨터공학과",
  ],
  문과대학: [
    "국어국문문예창작학부",
    "사학과",
    "철학과",
    "영어영문학부",
    "일본학과",
  ],
  바이오시스템대학: ["의생명공학과", "바이오환경과학과"],
  사회과학대학: [
    "정치외교학전공",
    "행정학전공",
    "경제학전공",
    "사회학전공",
    "미디어커뮤니케이션학전공",
  ],
  경영대학: ["경영학과", "국제통상학과", "회계학과"],
};
export const ALL_DEPARTMENTS: string[] = Object.values(DEPARTMENT_MAP).flat();

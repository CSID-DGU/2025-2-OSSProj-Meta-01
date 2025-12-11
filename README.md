# 2025-2 OSSProj Meta

# 교내외 장학 정보 통합 시스템 Meta

# 0. 팀원 소개
| **이름**  | **역할**     | **학과**           | **Github**                              |
|---------|------------|------------------|-----------------------------------------|
| **배범서** | `Backend`  | 통계학과 / 데이터사이언스SW | [Github](https://github.com/skqorrla)   |      |      |      |      |      |      |
| **정준희** | `Frontend` | 융합보안학과 / 융합SW    | [Github](https://github.com/jjh-98)     |      |      |      |      |      |      |
| **양승경** | `Backend`  | 전자전기공학부 / 융합SW   | [Github](https://github.com/ysgyeong00) |      |      |      |      |      |      |

# 1. 개발 목표
## 1.1. 개발동기 및 목적
장학 정보는 학교·정부·재단·기업 등 여러 기관에 분산되어 접근 경로가 제각각이다. 학생은 교내 포털과 다수의 외부 사이트를 반복적으로 방문해 조건을 비교해야 하며, 이 과정에서 최신 공지를 놓치거나 장학금 비교에 시간을 소모한다. 개인화 추천 체계도 없어 전공·학년·소득·자격증 등 개별 조건에 맞는 정보를 선별하기 어렵다. 이러한 환경적 제약을 해소하기 위해, ‘Meta’는 다양한 출처의 공지를 한곳에 모으고 이용자 프로필을 반영한 AI 추천을 제공하는 통합 플랫폼을 지향한다.

## 1.2. 필요성
통합·개인화·일정 관리를 한 흐름으로 제공하면 사용자는 검색·선별·캘린더 등록까지의 전체 과정을 단축하고, 적합한 장학을 제때 신청할 확률이 높아진다. 동시에 관리자는 노출 사각지대를 줄여 미달·반납 등으로 인한 예산 낭비를 방지할 수 있다. 결과적으로 ‘Meta’는 정보 접근성 향상, 신청 효율 증대, 예산 집행의 효과 증대라는 세 가지 관점에서 명확한 가치를 제공하며, 장학 제도의 형평성과 성과를 함께 끌어올리는 인프라로서의 필요성이 크다.

## 1.3. 개발목표
‘교내외 장학 정보 통합 시스템 Meta’의 개발 목표는 분산된 장학 정보를 통합하고, 사용자 맞춤형 추천과 일정 관리를 제공하는 통합 플랫폼 구축에 있다. 구체적으로는 다음과 같다.

1) 교내 및 교외 장학 정보의 통합
교내 및 교외 기관에서 제공하는 장학 정보를 수집·정제하여, 형식을 통일한 통합 데이터베이스를 구축한다. 또한, 모든 장학 공지에 대해서 키워드를 부여하고, 키워드 필터링을 통해서 사용자가 필요한 장학 공지만 볼 수 있도록 한다.

2) AI 기반 사용자 맞춤 추천 기능 구현
사용자의 학적 정보(전공, 학년 등)와 자격증 등에 따라 개인에게 가장 적합한 장학 공지를 AI 모델과 Huggingface 임베딩 모델을 사용해서 추천한다. 

3) 알림 시스템
사용자가 북마크한 장학 정보를 확인할 수 있도록 마감 24시간 전 알림은 보낸다. 캘린더 화면에서는 사용자가 북마크한 장학 정보의 일정을 볼 수 있고, 원하는 D-Day에 추가 알림을 받을 수 있도록 설정할 수 있다.

4) 마이페이지
사용자의 다양한 정보를 추가 및 수정할 수 있다. 사용자가 관심있는 장학 공지의 키워드를 선택하면, 해당 키워드의 장학 공지를 우선적으로 표시한다. 사용자가 취득한 자격증 정보도 입력 및 수정할 수 있다.

# 2. 설계 및 구현
## 2-1) 전체 아키텍처
![OSSProj_Architecture](/Docs/img/OSSProj_Architecture.png)

- 유스케이스 다이어그램
![OSSProj_Usecase](/Docs/img/Ossproj_Usecase.png)

- 시스템 블록 다이어그램
![OSSProj_SystemBlockDiagram](/Docs/img/OSSProj_SystemBlockDiagram.png)


## 2-2) DB 설계
- 데이터베이스 저장 정보

- ERD
![OSSProj_ERD](/Docs/img/OSSProj_ERD3.jpg)

## 2-3) 주요 기능 흐름
- 시퀀스 다이어그램
![OSSProj_Sequence1](/Docs/img/OSSProj_Sequence1.png)
![OSSProj_Sequence2](/Docs/img/OSSProj_Sequence2.png)
![OSSProj_Sequence3](/Docs/img/OSSProj_Sequence3.png)
![OSSProj_Sequence4](/Docs/img/OSSProj_Sequence4.png)

# 3. 서비스 구현 결과
- 회원가입 및 로그인
![OSSProj_Service1](/Docs/img/Tnn_Meta_1_회원가입,%20로그인.png)

- 회원가입
![OSSProj_Service1](/Docs/img/Tnn_Meta_2_회원가입1.png)
![OSSProj_Service1](/Docs/img/Tnn_Meta_3_회원가입2.png)

- 메인페이지
![OSSProj_Service1](/Docs/img/Tnn_Meta_4_메인페이지.png)

- 장학금 상세보기
![OSSProj_Service1](/Docs/img/Tnn_Meta_5_장학금%20상세보기1.png)
![OSSProj_Service1](/Docs/img/Tnn_Meta_6_장학금%20상세보기2.png)

- 장학금 리스트
![OSSProj_Service1](/Docs/img/Tnn_Meta_7_장학금%20리스트.png)

- 캘린더
![OSSProj_Service1](/Docs/img/Tnn_Meta_8_캘린더.png)

- 알림센터
![OSSProj_Service1](/Docs/img/Tnn_Meta_9_알림센터.png)

- 마이페이지
![OSSProj_Service1](/Docs/img/Tnn_Meta_10_마이페이지1.png)
![OSSProj_Service1](/Docs/img/Tnn_Meta_11_마이페이지2.png)

# 4. 기대효과
## 4-1) 학생 측면
- 접근성 향상: 교내외 장학 정보를 한 플랫폼에서 확인할 수 있어, 여러 사이트를 오고가며 검색하던 시간과 노력을 절감할 수 있다. 
- 개인 맞춤형 추천: 전공, 학년, 소득 분위 등 개인 조건에 맞는 장학 정보가 자동으로 추천되어 불필요한 정보 탐색이 줄어든다.
- 일정 관리의 편의성: 관심 장학의 마감일을 캘린더에 등록하고 원하는 D-day에 알림을 받을 수 있어, 신청 누락을 방지할 수 있다.

## 4-2) 학교/기관 측면
- 홍보 효율 증대: 통합 플랫폼 내 노출을 통해 기존에 접근이 어려웠던 학생층까지 도달할 수 있으며, 장학금 미달 등의 문제를 줄일 수 있다.
- 데이터 기반 운영: 북마크 한 장학 정보, 북마크 수 등을 통해서 추후 장학 사업 기획 및 예산 운용의 근거 자료로 활용할 수 있다.

## 4-3) 기술 측면
- AI 기반 추천 시스템 구축: Two-Tower 모델을 활용한 개인화 추천으로 대규모 데이터에서도 빠른 검색과 정교한 매칭을 가능하게 한다.
- 확장성 확보: 애플리케이션을 모듈형으로 설계하여 학교, 재단 등 신규 기관이 쉽게 참여할 수 있도록 한다.
- 서비스 고도화 기반 마련: 이후 사용 데이터가 축적되면 추천 정확도 개선, 장학금 수혜 예측 등으로 확장할 수 있는 기술적 토대를 제공한다.

# 5. 실행 방법
[제품구성배포운영자료](/Docs/3_4_OSSProj_01_Meta_제품구성배포운영자료.pdf.pdf)

# 6. 자료 관리
## 제안발표
[수행계획서](/Docs/1_1_OSSProj_01_Meta_수행계획서.pdf)\
[발표자료](/Docs/1_2_OSSProj_01_Meta_수행계획발표자료.pdf)\
[회의록](/Docs/1_3_OSSProj_01_Meta_회의록.pdf)

## 중간발표
[중간보고서](/Docs/2_1_OSSProj_01_Meta_중간보고서.pdf)\
[발표자료](/Docs/2_2_OSSProj_01_Meta_중간발표자료.pdf)\
[회의록](/Docs/2_3_OSSProj_01_Meta_회의록.pdf)

## 최종발표
[최종보고서](/Docs/3_1_OSSProj_01_Meta_최종보고서.pdf)\
[발표자료](/Docs/3_2_OSSProj_01_Meta_최종발표자료.pdf)\
[회의록](/Docs/3_3_OSSProj_01_Meta_회의록.pdf)\
[제품구성배포운영자료](/Docs/3_4_OSSProj_01_Meta_제품구성배포운영자료.pdf)\
[시연영상](/Docs/3_5_OSSProj_01_Meta_시연동영상.mp4)

# 7. 이슈 관리
[이슈관리](https://github.com/CSID-DGU/2025-2-OSSProj-Meta-01/issues)
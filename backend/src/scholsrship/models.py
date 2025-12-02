from django.db import models
from authentication.models import User
from mypage.models import Scholarship  # 장학금 모델은 기존 mypage.models 에 있음
from mypage.models import Keyword


class ScholarshipKeyword(models.Model):
    scholarship_keyword_id = models.AutoField(primary_key=True)
    scholarship = models.ForeignKey(
        Scholarship, on_delete=models.CASCADE, db_column="scholarship_id"
    )
    keyword = models.ForeignKey(
        Keyword, on_delete=models.CASCADE, db_column="keyword_id"
    )

    class Meta:
        db_table = "ScholarshipKeywords"
        unique_together = ("scholarship", "keyword")


class Recommendation(models.Model):
    recommendation_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id")
    scholarship = models.ForeignKey(
        Scholarship, on_delete=models.CASCADE, db_column="scholarship_id"
    )

    class Meta:
        db_table = "Recommendations"
        unique_together = ("user", "scholarship")

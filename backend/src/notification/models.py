from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from mypage.models import Bookmark


class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    bookmark = models.ForeignKey(
        Bookmark,
        on_delete=models.CASCADE,
        db_column="bookmark_id"
    )

    notification_date = models.IntegerField(
        validators=[
            MinValueValidator(0),
            MaxValueValidator(10),
        ],
        help_text="0 = D-day, 1 = D-1 ... 10 = D-10"
    )

    class Meta:
        db_table = "Notifications"
        unique_together = ("bookmark", "notification_date")

    def __str__(self):
        return f"bookmark={self.bookmark_id}, D-{self.notification_date}"

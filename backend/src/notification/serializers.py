from rest_framework import serializers
from .models import Notification
from mypage.models import Bookmark

class CalendarSerializer(serializers.ModelSerializer):
    scholarship_id = serializers.IntegerField(
        source="scholarship.scholarship_id",
        read_only=True
    )
    scholarship_name = serializers.CharField(
        source="scholarship.scholarship_name",
        read_only=True
    )
    end_date = serializers.DateField(
        source="scholarship.end_date",
        read_only=True
    )
    doc_id = serializers.IntegerField(
        source="scholarship.doc_id",
        read_only=True
    )

    class Meta:
        model = Bookmark
        fields = [
            "bookmark_id",
            "scholarship_id",
            "scholarship_name",
            "end_date",
            "doc_id",
        ]

class NotificationSerializer(serializers.ModelSerializer):
    scholarship_id = serializers.IntegerField(
        source="bookmark.scholarship.scholarship_id",
        read_only=True
    )
    scholarship_name = serializers.CharField(
        source="bookmark.scholarship.scholarship_name",
        read_only=True
    )
    end_date = serializers.DateField(
        source="bookmark.scholarship.end_date",
        read_only=True
    )
    doc_id = serializers.IntegerField(
        source="bookmark.scholarship.doc_id",
        read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "notification_id",
            "notification_date",
            "scholarship_id",
            "scholarship_name",
            "end_date",
            "doc_id",
        ]

class NotificationCreateSerializer(serializers.ModelSerializer):
    notification_date = serializers.IntegerField(
        min_value=0,
        max_value=10,
        error_messages={
            "min_value": "D-day는 0 이상만 설정할 수 있습니다.",
            "max_value": "D-day는 10 이하만 설정할 수 있습니다.",
            "invalid": "올바른 D-day 형식이 아닙니다."
        }
    )

    class Meta:
        model = Notification
        fields = ["notification_date"]

    def validate(self, attrs):
        bookmark = self.context.get("bookmark")
        notification_date = attrs.get("notification_date")

        if bookmark is None:
            raise serializers.ValidationError(
                {"error": "북마크 정보가 존재하지 않습니다."}
            )

        if Notification.objects.filter(
            bookmark=bookmark,
            notification_date=notification_date
        ).exists():
            raise serializers.ValidationError(
                {"notification_date": "이미 설정된 D-day입니다."}
            )

        return attrs

    def create(self, validated_data):
        bookmark = self.context.get("bookmark")
        return Notification.objects.create(
            bookmark=bookmark,
            notification_date=validated_data["notification_date"]
        )

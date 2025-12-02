from rest_framework import serializers
from mypage.models import Scholarship, Bookmark
from .models import ScholarshipKeyword


class ScholarshipSerializer(serializers.ModelSerializer):
    scholarship_id = serializers.IntegerField(read_only=True)
    is_bookmarked = serializers.SerializerMethodField()
    keywords = serializers.SerializerMethodField()

    class Meta:
        model = Scholarship
        fields = [
            "scholarship_id",
            "scholarship_name",
            "start_date",
            "end_date",
            "url",
            "image_url",
            "is_bookmarked",
            "keywords",
        ]

    def get_is_bookmarked(self, obj):
        user = self.context["request"].user
        return Bookmark.objects.filter(user=user, scholarship=obj).exists()

    def get_keywords(self, obj):
        q = ScholarshipKeyword.objects.filter(scholarship=obj).select_related("keyword")
        return [{"keyword_id": sk.keyword.keyword_id, "keyword": sk.keyword.keyword}
                for sk in q]

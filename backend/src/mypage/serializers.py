from rest_framework import serializers
from authentication.models import User
from .models import (
    Keyword, UserKeyword,
    Certification, UserCertification,
    Scholarship, Bookmark
)

# 1. 사용자 개인정보
class UserInfoSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='major.university.university_name', read_only=True)
    major_name = serializers.CharField(source='major.major_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_name',
            'university_name',
            'major_name',
            'year',
            'gpa',
            'income_level',
            'email',
            'phone',
            'receive_notifications',
        ]

# 2. 관심 키워드
class KeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Keyword
        fields = ['keyword_id', 'keyword']


class UserKeywordSerializer(serializers.ModelSerializer):
    keyword = KeywordSerializer(read_only=True)
    keyword_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserKeyword
        fields = [
            'user_keyword_id',
            'keyword',
            'keyword_id',
        ]

# 3. 자격증
class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['certification_id', 'certification_name', 'category']


class UserCertificationSerializer(serializers.ModelSerializer):
    certification = CertificationSerializer(read_only=True)
    certification_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserCertification
        fields = [
            'user_certification_id',
            'certification',
            'certification_id',
            'score',
            'acquired_date',
            'expiration_date',
        ]

# 4. 북마크
class BookmarkSerializer(serializers.ModelSerializer):
    scholarship_name = serializers.CharField(source='scholarship.scholarship_name', read_only=True)
    start_date = serializers.DateField(source='scholarship.start_date', read_only=True)
    end_date = serializers.DateField(source='scholarship.end_date', read_only=True)

    class Meta:
        model = Bookmark
        fields = [
            'bookmark_id',
            'scholarship_name',
            'start_date',
            'end_date',
        ]

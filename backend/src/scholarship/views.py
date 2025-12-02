from datetime import date
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from mypage.models import Scholarship, Bookmark, UserKeyword
from .models import ScholarshipKeyword, Recommendation
from .serializers import ScholarshipSerializer
from django.conf import settings
from pymongo import MongoClient
from bson.json_util import dumps, loads

class ScholarshipListView(generics.ListAPIView):
    serializer_class = ScholarshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        today = date.today()

        user_keywords = list(
            UserKeyword.objects.filter(user=user).values_list("keyword_id", flat=True)
        )

        extra_param = self.request.GET.get("extra_keywords")

        if extra_param is not None:  
            if extra_param.strip() == "":
                final_keywords = []
            else:
                final_keywords = [
                    int(k) for k in extra_param.split(",") if k.strip().isdigit()
                ]
        else:
            final_keywords = user_keywords

        if len(final_keywords) == 0:
            scholarships = Scholarship.objects.all()
        else:
            scholarships = Scholarship.objects.filter(
                scholarship_id__in=ScholarshipKeyword.objects.filter(
                    keyword_id__in=final_keywords
                ).values_list("scholarship_id", flat=True)
            )

        future = scholarships.filter(end_date__gte=today).order_by("end_date")
        past = scholarships.filter(end_date__lt=today).order_by("-end_date")

        return list(future) + list(past)

class ScholarshipDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, scholarship_id):
        try:
            scholarship = Scholarship.objects.get(scholarship_id=scholarship_id)
        except Scholarship.DoesNotExist:
            return Response({"error": "존재하지 않는 장학금입니다."},
                            status=status.HTTP_404_NOT_FOUND)

        if not scholarship.doc_id:
            return Response({"error": "해당 장학금에 상세 정보가 없습니다."},
                            status=status.HTTP_404_NOT_FOUND)

        mongo_client = MongoClient(settings.MONGODB_URI)
        mongo_db = mongo_client[settings.MONGODB_NAME]
        collection = mongo_db[settings.MONGODB_COLLECTION]

        doc = collection.find_one({"doc_id": scholarship.doc_id})

        if not doc:
            return Response({"error": "MongoDB에서 해당 장학금 상세 정보를 찾을 수 없습니다."},
                            status=status.HTTP_404_NOT_FOUND)

        detail_data = loads(dumps(doc))

        is_bookmarked = Bookmark.objects.filter(
            user=request.user, scholarship=scholarship
        ).exists()

        response_data = {
            "scholarship_id": scholarship.scholarship_id,
            "scholarship_name": scholarship.scholarship_name,
            "start_date": scholarship.start_date,
            "end_date": scholarship.end_date,
            "url": scholarship.url,
            "image_url": scholarship.image_url,
            "is_bookmarked": is_bookmarked,
            "detail": detail_data,
        }

        return Response(response_data, status=status.HTTP_200_OK)

class ScholarshipBookmarkToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, scholarship_id):
        user = request.user

        try:
            scholarship = Scholarship.objects.get(scholarship_id=scholarship_id)
        except Scholarship.DoesNotExist:
            return Response({"error": "존재하지 않는 장학금입니다."},
                            status=status.HTTP_404_NOT_FOUND)

        bookmark, created = Bookmark.objects.get_or_create(
            user=user,
            scholarship=scholarship
        )

        if not created:
            bookmark.delete()
            return Response({"message": "북마크가 삭제되었습니다."})

        return Response({"message": "북마크가 추가되었습니다."})

class RecommendationListView(generics.ListAPIView):
    serializer_class = ScholarshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        today = date.today()

        scholarship_ids = Recommendation.objects.filter(
            user=user
        ).values_list("scholarship_id", flat=True)

        scholarships = Scholarship.objects.filter(
            scholarship_id__in=scholarship_ids
        )

        future = scholarships.filter(end_date__gte=today).order_by("end_date")
        past = scholarships.filter(end_date__lt=today).order_by("-end_date")

        return list(future) + list(past)

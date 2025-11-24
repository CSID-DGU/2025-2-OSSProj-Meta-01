from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from authentication.models import User
from .exceptions import CustomExceptionHandlerMixin
from .models import (
    Keyword, UserKeyword,
    Certification, UserCertification,
    Bookmark
)
from .serializers import (
    UserInfoSerializer,
    KeywordSerializer, UserKeywordSerializer,
    CertificationSerializer, UserCertificationSerializer,
    BookmarkSerializer
)

# 1. 사용자 개인정보
class MyInfoView(CustomExceptionHandlerMixin, generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            from .serializers import UserUpdateSerializer
            return UserUpdateSerializer
        return UserInfoSerializer

# 2. 키워드
class KeywordListView(CustomExceptionHandlerMixin, generics.ListAPIView):
    queryset = Keyword.objects.all()
    serializer_class = KeywordSerializer
    permission_classes = [IsAuthenticated]

class MyKeywordListView(CustomExceptionHandlerMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        keywords = UserKeyword.objects.filter(user=request.user)
        keyword_names = [uk.keyword.keyword for uk in keywords]
        return Response(keyword_names)


class MyKeywordCreateView(CustomExceptionHandlerMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserKeywordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        updated_keywords = list(
            UserKeyword.objects.filter(user=request.user)
            .values_list('keyword__keyword', flat=True)
        )

        return Response({
            "message": "키워드가 추가되었습니다.",
            "keywords": updated_keywords
        })


class MyKeywordDeleteView(CustomExceptionHandlerMixin, APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_keyword_id):
        try:
            user_keyword = UserKeyword.objects.get(
                user=request.user,
                user_keyword_id=user_keyword_id
            )
        except UserKeyword.DoesNotExist:
            return Response(
                {"error": "존재하지 않는 관심 키워드입니다."},
                status=404
            )

        user_keyword.delete()

        updated_keywords = list(
            UserKeyword.objects.filter(user=request.user)
            .values_list('keyword__keyword', flat=True)
        )

        return Response({
            "message": "키워드가 삭제되었습니다.",
            "keywords": updated_keywords
        })

# 3. 자격증
class CertificationListView(CustomExceptionHandlerMixin, generics.ListAPIView):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticated]


class MyCertificationListCreateView(CustomExceptionHandlerMixin, generics.ListCreateAPIView):
    serializer_class = UserCertificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserCertification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyCertificationDetailView(CustomExceptionHandlerMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = UserCertification.objects.all()
    serializer_class = UserCertificationSerializer
    lookup_url_kwarg = 'user_certification_id'
    permission_classes = [IsAuthenticated]

# 4. 북마크
class MyBookmarkListView(CustomExceptionHandlerMixin, generics.ListAPIView):
    serializer_class = BookmarkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user)

class MyBookmarkDeleteView(CustomExceptionHandlerMixin, generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Bookmark.objects.all()
    lookup_url_kwarg = 'bookmark_id'

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user)

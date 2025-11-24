from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

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


class MyKeywordListCreateView(CustomExceptionHandlerMixin, generics.ListCreateAPIView):
    serializer_class = UserKeywordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserKeyword.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MyKeywordDeleteView(CustomExceptionHandlerMixin, generics.DestroyAPIView):
    queryset = UserKeyword.objects.all()
    lookup_url_kwarg = 'user_keyword_id'
    permission_classes = [IsAuthenticated]

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

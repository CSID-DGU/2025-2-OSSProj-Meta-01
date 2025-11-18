from django.urls import path
from .views import (
    MyInfoView,
    KeywordListView, MyKeywordListCreateView, MyKeywordDeleteView,
    CertificationListView, MyCertificationListCreateView, MyCertificationDetailView,
    MyBookmarkListView, MyBookmarkDeleteView
)

urlpatterns = [
    path('me/', MyInfoView.as_view()),

    path('keywords/', KeywordListView.as_view()),
    path('me/keywords/', MyKeywordListCreateView.as_view()),
    path('me/keywords/<int:user_keyword_id>/', MyKeywordDeleteView.as_view()),

    path('certifications/', CertificationListView.as_view()),
    path('me/certifications/', MyCertificationListCreateView.as_view()),
    path('me/certifications/<int:user_certification_id>/', MyCertificationDetailView.as_view()),

    path('me/bookmarks/', MyBookmarkListView.as_view()),
    path('me/bookmarks/<int:bookmark_id>/', MyBookmarkDeleteView.as_view()),
]

from django.urls import path
from .views import (
    MyInfoView,
    KeywordListView, MyKeywordListView, MyKeywordCreateView, MyKeywordDeleteView,
    CertificationListView, MyCertificationListCreateView, MyCertificationDetailView,
    MyBookmarkListView, MyBookmarkDeleteView
)

urlpatterns = [
    path('me/', MyInfoView.as_view(), name='mypage'),

    path('keywords/', KeywordListView.as_view(), name='keyword_list'),
    path('me/keywords/', MyKeywordListView.as_view(), name='my_keywords'),
    path('me/keywords/add/', MyKeywordCreateView.as_view(), name='add_my_keyword'),
    path('me/keywords/<int:user_keyword_id>/', MyKeywordDeleteView.as_view(), name='delete_my_keyword'),

    path('certifications/', CertificationListView.as_view()),
    path('me/certifications/', MyCertificationListCreateView.as_view()),
    path('me/certifications/<int:user_certification_id>/', MyCertificationDetailView.as_view()),

    path('me/bookmarks/', MyBookmarkListView.as_view()),
    path('me/bookmarks/<int:bookmark_id>/', MyBookmarkDeleteView.as_view()),
]

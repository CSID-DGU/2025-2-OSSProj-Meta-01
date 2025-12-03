from django.urls import path
from .views import (
    ScholarshipListView,
    ScholarshipBookmarkToggleView,
    RecommendationListView,
    ScholarshipDetailView,
)

urlpatterns = [
    path("", ScholarshipListView.as_view(), name='scholarship_list'),
    path("recommendations/", RecommendationListView.as_view(), name='my_recommendations'),
    path("<int:scholarship_id>/", ScholarshipDetailView.as_view(), name='scholarship_detail'),
    path("<int:scholarship_id>/bookmark/", ScholarshipBookmarkToggleView.as_view(), name='scholarship_bookmark_toggle'),
]

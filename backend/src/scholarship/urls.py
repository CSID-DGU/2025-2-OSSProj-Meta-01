from django.urls import path
from .views import (
    ScholarshipListView,
    ScholarshipBookmarkToggleView,
    RecommendationListView,
    ScholarshipDetailView,
)

urlpatterns = [
    path("", ScholarshipListView.as_view()),
    path("recommendations/", RecommendationListView.as_view()),
    path("<int:scholarship_id>/", ScholarshipDetailView.as_view()),
    path("<int:scholarship_id>/bookmark/", ScholarshipBookmarkToggleView.as_view()),
]

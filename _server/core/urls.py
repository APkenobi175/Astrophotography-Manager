from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/sessions/", views.sessions_collection, name="sessions_collection"),
    path("api/sessions/<int:session_id>/", views.session_detail, name="session_detail"),
    path("api/sessions/public/", views.public_sessions, name="public_sessions"),
    path("api/me/", views.current_user, name="current_user"),
    path("api/targets/search/", views.search_targets, name="search_targets"),
    path("api/sessions/liked/", views.liked_sessions, name="liked_sessions"),
    path("api/sessions/<int:session_id>/like/", views.toggle_session_like, name="toggle_session_like"),
    path("api/sessions/<int:session_id>/images/", views.upload_session_images, name="upload_session_images"),
    path("api/sessions/<int:session_id>/images/<int:image_id>/", views.delete_session_image, name="delete_session_image"),
    path("api/profile/<str:username>/", views.user_profile, name="user_profile"),
    path("api/profile/<str:username>/picture/", views.upload_profile_picture, name="upload_profile_picture"),
    path("api/chat/conversations/", views.chat_conversations, name="chat_conversations"),
    path("api/chat/conversations/<int:convo_id>/", views.chat_messages, name="chat_messages"),
    path("api/chat/start/<str:username>/", views.chat_start, name="chat_start"),
]

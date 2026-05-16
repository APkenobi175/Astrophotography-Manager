from django.conf import settings
from django.db import models


class Session(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    title = models.CharField(max_length=200)
    target = models.CharField(max_length=200)

    datetime_start = models.DateTimeField()
    location_name = models.CharField(max_length=200)

    light_frames = models.PositiveIntegerField(default=0)
    light_exposure_seconds = models.PositiveIntegerField(default=0)
    iso = models.PositiveIntegerField(null=True, blank=True)

    camera_model = models.CharField(max_length=100)
    telescope_or_lens = models.CharField(max_length=100)

    notes = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    # Social Media Type Stuff

    caption = models.TextField(blank=True)
    post_creation_date = models.DateTimeField(auto_now_add = True)

    def __str__(self):
        return f"{self.title} - {self.target} - {self.user.username}"

# This model represents a "like" by a user and will have its own table
class SessionLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "session")  # 1 like per user per session

    def __str__(self):
        return f"{self.user.username} ♡ {self.session_id}"


class SessionImage(models.Model):
    # Model to store images for a session
    session = models.ForeignKey(Session, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="session_images/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for session {self.session_id} ({self.id})"


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to="profile_pictures/", null=True, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


class ChatConversation(models.Model):
    # user1.id is always < user2.id to prevent duplicate pairs
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations_as_user1")
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations_as_user2")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user1", "user2")

    def other_user(self, me):
        return self.user2 if self.user1_id == me.id else self.user1

    def __str__(self):
        return f"Chat {self.user1_id} ↔ {self.user2_id}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.conversation_id}] {self.sender_id}: {self.body[:40]}"
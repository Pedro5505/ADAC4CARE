import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AuditEvent(models.Model):
    class Action(models.TextChoices):
        READ = "READ", "Read"
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE_ATTEMPT = "DELETE_ATTEMPT", "Delete attempt"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT)
    action = models.CharField(max_length=20, choices=Action.choices)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True)
    request_path = models.CharField(max_length=500)
    request_id = models.UUIDField(default=uuid.uuid4)
    metadata = models.JSONField(default=dict)
    occurred_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-occurred_at"]

    def save(self, *args, **kwargs):
        if self.pk and AuditEvent.objects.filter(pk=self.pk).exists():
            raise ValidationError("Audit events are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events cannot be deleted.")

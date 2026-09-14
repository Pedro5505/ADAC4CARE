import uuid
from django.db import models


class Organisation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    abn = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Home(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(Organisation, related_name="homes", on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    suburb = models.CharField(max_length=100)
    state = models.CharField(max_length=3, default="NSW")
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Client(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    home = models.ForeignKey(Home, related_name="clients", on_delete=models.PROTECT)
    given_name = models.CharField(max_length=100)
    family_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    allergies = models.JSONField(default=list)
    ndis_number = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def full_name(self):
        return f"{self.given_name} {self.family_name}"

    def __str__(self):
        return self.full_name

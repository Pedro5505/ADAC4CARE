from rest_framework import serializers
from .models import AdministrationEvent


class AdministrationEventSerializer(serializers.ModelSerializer):
    administered_by = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = AdministrationEvent
        fields = "__all__"
        read_only_fields = ["created_at"]

    def update(self, instance, validated_data):
        raise serializers.ValidationError("Administration events are immutable.")

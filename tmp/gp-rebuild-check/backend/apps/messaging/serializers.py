from rest_framework import serializers
from .models import ChartMessage


class ChartMessageSerializer(serializers.ModelSerializer):
    sender = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = ChartMessage
        fields = "__all__"
        read_only_fields = ["created_at"]

from django.db import models


class Leader(models.Model):
    """A member of Muddo Agro's leadership team, shown on the About page."""
    name = models.CharField(max_length=120)
    title = models.CharField(max_length=120)
    bio = models.TextField(blank=True, max_length=800)
    photo = models.ImageField(upload_to='leadership/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.name} — {self.title}'

    @property
    def photo_path(self):
        try:
            return self.photo.url if self.photo else None
        except ValueError:
            return None

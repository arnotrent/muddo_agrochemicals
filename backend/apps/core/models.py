import secrets, string
from django.db import models
from django.contrib.auth.models import User

from apps.core.media import public_media_url

_ALPHABET = string.ascii_uppercase + string.digits


def gen_ref():
    # secrets (CSPRNG): reference numbers can't be predicted or enumerated. Name kept because
    # migration core.0001 imports it by path.
    return 'ENQ-' + ''.join(secrets.choice(_ALPHABET) for _ in range(8))


class ContactRequest(models.Model):
    STATUS = [('new', 'New'), ('pending', 'Pending'), ('resolved', 'Resolved')]
    SUBJECTS = [('Product Enquiry', 'Product Enquiry'), ('Pricing / Quotation', 'Pricing / Quotation'),
                ('Wholesale / Bulk Order', 'Wholesale / Bulk Order'), ('Distributor Partnership', 'Distributor Partnership'),
                ('Technical / Agronomy Advice', 'Technical / Agronomy Advice'), ('General Enquiry', 'General Enquiry')]
    ref_number = models.CharField(max_length=20, unique=True, default=gen_ref)
    name = models.CharField(max_length=200); email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    subject = models.CharField(max_length=100, choices=SUBJECTS)
    message = models.TextField(); status = models.CharField(max_length=20, choices=STATUS, default='new')
    email_sent = models.BooleanField(default=False); created_at = models.DateTimeField(auto_now_add=True)
    # Workflow: the admin can answer directly or FORWARD the enquiry to a field agent, who answers the customer.
    assigned_agent = models.ForeignKey('agents.Agent', null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_enquiries')
    assigned_at = models.DateTimeField(null=True, blank=True)
    assigned_note = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.ref_number}] {self.name}"


class EnquiryReply(models.Model):
    """One entry in an enquiry's history: a reply sent to the customer, a forward to an agent, or an internal note."""
    KINDS = [('reply', 'Reply to customer'), ('forward', 'Forwarded to agent'), ('note', 'Internal note')]
    enquiry = models.ForeignKey(ContactRequest, on_delete=models.CASCADE, related_name='replies')
    author_role = models.CharField(max_length=10)          # admin | agent
    author_name = models.CharField(max_length=150)
    kind = models.CharField(max_length=10, choices=KINDS, default='reply')
    message = models.TextField()
    emailed = models.BooleanField(default=False)           # was the e-mail to the customer actually accepted for delivery?
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'{self.enquiry.ref_number} · {self.kind} by {self.author_name}'


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True); name = models.CharField(max_length=200, blank=True)
    active = models.BooleanField(default=True); subscribed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    display_name = models.CharField(max_length=150, blank=True)
    avatar = models.ImageField(upload_to='avatars/staff/', blank=True, null=True)

    def __str__(self): return self.name

    @property
    def name(self):
        return self.display_name.strip() if self.display_name and self.display_name.strip() else self.original_name

    @property
    def original_name(self):
        return self.user.get_full_name() or self.user.username

    @property
    def avatar_url(self):
        return public_media_url(self.avatar)


class SiteSettings(models.Model):
    year_founded = models.CharField(max_length=4, default='2020')
    company_phone = models.CharField(max_length=100, default='+256 772 507582 / 0702-507582')
    company_phone_secondary = models.CharField(max_length=100, blank=True, default='0772 971620 / 0701-971620')
    company_email = models.EmailField(default='muddoagro811@gmail.com')
    company_address = models.CharField(max_length=300, default='Container Village Nakivubo, Equity Bank Basement V013, P.O Box 25240')
    business_hours = models.CharField(max_length=200, default='Monday to Saturday, 8am until 6pm')
    whatsapp_number = models.CharField(max_length=30, default='256772507582')
    facebook_url = models.URLField(blank=True, default='https://facebook.com/p/MUDDO-AGRO-Chemicals-LTD-100063836929481/')

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def __str__(self):
        return 'Site Settings'

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class FAQ(models.Model):
    question = models.CharField(max_length=300)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.question


class StoredFile(models.Model):
    """An uploaded picture kept IN THE DATABASE so it survives Render redeploys (see apps/core/db_storage.py)."""
    name = models.CharField(max_length=255, unique=True)
    content = models.BinaryField()
    content_type = models.CharField(max_length=120, default='application/octet-stream')
    size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

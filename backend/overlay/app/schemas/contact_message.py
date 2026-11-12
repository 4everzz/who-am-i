"""个人站联系表单请求与返回结构。"""

from datetime import datetime
import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContactMessageCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    request_id: UUID
    category: str = Field(..., pattern="^(cooperation|suggestion)$")
    nickname: str = Field(..., min_length=1, max_length=80)
    contact: str = Field(..., min_length=3, max_length=160)
    content: str = Field(..., min_length=1, max_length=4000)
    website: str = Field(default="", max_length=200)

    @field_validator("nickname", "contact", "content")
    @classmethod
    def strip_and_require_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("内容不能为空")
        if any(ord(char) < 32 and char not in '\n\r\t' for char in value):
            raise ValueError("包含无效字符")
        return value

    @field_validator("nickname", "contact")
    @classmethod
    def no_header_controls(cls, value: str) -> str:
        if any(c in value for c in '\n\r\t'):
            raise ValueError("请使用单行文本")
        return value

    @field_validator("contact")
    @classmethod
    def validate_contact(cls, value: str) -> str:
        email = re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", value)
        digits = re.sub(r"[\s()+.-]", "", value)
        if not email and not (re.fullmatch(r"[0-9]{7,15}", digits)):
            raise ValueError("请填写有效的手机号或邮箱")
        return value


class ContactMessageInfo(BaseModel):
    id: int
    category: str
    nickname: str
    contact: str
    content: str
    status: str
    created_at: datetime
    read_at: datetime | None
    notification_sent_at: datetime | None


class ContactMessageListItem(ContactMessageInfo):
    notification_error: str | None = None

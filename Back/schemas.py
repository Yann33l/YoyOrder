from datetime import date

from pydantic import BaseModel


# Token
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    Email: str
    Admin: bool
    Autorisation: bool

# table users
class UserForm(BaseModel):
    Email: str
    Password: str


class UserEditAdmin (BaseModel):
    Email: str
    Admin: bool


class UserEditAutorisation (BaseModel):
    Email: str
    Autorisation: bool


class UserBase(BaseModel):
    Email: str
    Admin: bool
    Autorisation: bool

    class Config:
        orm_mode = True

class UserCreate(UserBase):
    Password: bytes


# table 
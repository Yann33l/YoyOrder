from sqlalchemy.orm import Session

from . import models, schemas


# Users
def get_user_by_ID(db: Session, id: int):
    return db.query(models.users).filter(models.users.ID == id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.users).filter(models.users.Email == email).scalar()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.users).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.users(
        Email=user.Email,
        Password=user.Password,
        Admin=user.Admin,
        Autorisation=user.Autorisation,
    )
    db.add(db_user)
    db.commit()
    return db_user


def edit_admin_status(db: Session, email: str, admin: bool):
    db_user = db.query(models.users).filter(
        models.users.Email == email).scalar()
    if db_user:
        db_user.Admin = admin
        db.commit()
        db.refresh(db_user)
    return db_user


def edit_autorisation_status(db: Session, email: str, autorisation: bool):
    db_user = db.query(models.users).filter(
        models.users.Email == email).scalar()
    if db_user:
        db_user.Autorisation = autorisation
        db.commit()
        db.refresh(db_user)
    return db_user


"""Regional data models for relocation financial comparison."""
from sqlalchemy import Float, Index, Integer, Numeric, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .transaction import Base


class RegionalCity(Base):
    """City reference data for relocation comparison."""

    __tablename__ = "regional_cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prefecture_code: Mapped[int] = mapped_column(Integer, nullable=False)
    city_code: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    prefecture_name: Mapped[str] = mapped_column(String(20), nullable=False)
    city_name: Mapped[str] = mapped_column(String(40), nullable=False)
    prefecture_name_en: Mapped[str] = mapped_column(String(40), nullable=False)
    city_name_en: Mapped[str] = mapped_column(String(60), nullable=False)

    rents: Mapped[list["RegionalRent"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )
    cost_indices: Mapped[list["RegionalCostIndex"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_regional_city_pref", "prefecture_code"),
    )


class RegionalRent(Base):
    """Average rent data by city and room type."""

    __tablename__ = "regional_rents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regional_cities.id", ondelete="CASCADE"), nullable=False
    )
    room_type: Mapped[str] = mapped_column(String(10), nullable=False)
    average_rent: Mapped[int] = mapped_column(Integer, nullable=False)
    data_year: Mapped[int] = mapped_column(Integer, nullable=False)

    city: Mapped["RegionalCity"] = relationship(back_populates="rents")

    __table_args__ = (
        Index("ix_rent_city_room", "city_id", "room_type", unique=True),
    )


class RegionalCostIndex(Base):
    """Regional cost-of-living index relative to national average."""

    __tablename__ = "regional_cost_indices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regional_cities.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    index_value: Mapped[float] = mapped_column(Float, nullable=False)
    data_year: Mapped[int] = mapped_column(Integer, nullable=False)

    city: Mapped["RegionalCity"] = relationship(back_populates="cost_indices")

    __table_args__ = (
        Index("ix_cost_city_cat", "city_id", "category", unique=True),
    )


class PrefectureInsuranceRate(Base):
    """Kyokai Kenpo social insurance rate by prefecture."""

    __tablename__ = "prefecture_insurance_rates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prefecture_code: Mapped[int] = mapped_column(
        Integer, nullable=False, unique=True
    )
    rate: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False)
    data_year: Mapped[int] = mapped_column(Integer, nullable=False)

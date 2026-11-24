import Decimal from 'decimal.js';

export type CompatibleUnit = 'KG' | 'G' | 'L' | 'ML' | 'PIECES' | 'PACKETS' | 'CARTONS';

export class UnitConversionService {
  /**
   * Convert quantity between compatible units.
   * Throws an error if units are incompatible (e.g. KG to L or PIECES to KG).
   */
  static convert(
    quantity: number | string | Decimal,
    fromUnit: CompatibleUnit,
    toUnit: CompatibleUnit
  ): Decimal {
    const qty = new Decimal(quantity);

    if (fromUnit === toUnit) {
      return qty;
    }

    // Mass conversion
    if ((fromUnit === 'KG' || fromUnit === 'G') && (toUnit === 'KG' || toUnit === 'G')) {
      if (fromUnit === 'KG' && toUnit === 'G') {
        return qty.times(1000);
      }
      if (fromUnit === 'G' && toUnit === 'KG') {
        return qty.dividedBy(1000);
      }
    }

    // Volume conversion
    if ((fromUnit === 'L' || fromUnit === 'ML') && (toUnit === 'L' || toUnit === 'ML')) {
      if (fromUnit === 'L' && toUnit === 'ML') {
        return qty.times(1000);
      }
      if (fromUnit === 'ML' && toUnit === 'L') {
        return qty.dividedBy(1000);
      }
    }

    // Packaging conversions (e.g. Carton to Pieces if specified)
    // Standard rule: 1 Carton = 20 packets (Benchmark rule)
    if (fromUnit === 'CARTONS' && toUnit === 'PACKETS') {
      return qty.times(20);
    }
    if (fromUnit === 'PACKETS' && toUnit === 'CARTONS') {
      return qty.dividedBy(20);
    }

    throw new Error(`Incompatible units for conversion: cannot convert from '${fromUnit}' to '${toUnit}'.`);
  }
}


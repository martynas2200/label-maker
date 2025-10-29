export function calculateTotalPrice(
  priceWithVat: number,
  quantity: number,
): number {
  if (priceWithVat == null || quantity == null) {
    return 0
  }
  const totalPrice = priceWithVat * quantity
  return Math.round((totalPrice + Number.EPSILON) * 100) / 100
}


export function getPricePerUnit(name: string, price: number): string | null {
  const regex = /(?:,?\s*)?(?:(\d+)\s*x\s*)?(\d+(\.\d+)?(?:,\d+)?)[\s]*(k?g|m?l|vnt|pak|rul)\b/i;
  const match = name.match(regex);
  if (match) {
    const match2 = name.replace(match[0], '').match(regex);
    if (match2) {
      return null;
    }
    const multiplier = match[1] ? parseInt(match[1]) : 1;
    const amount = parseFloat(match[2].replace(',', '.')) * multiplier;
    const unit = match[4].replace('.', '').toLowerCase();
    let pricePerUnit;
    if (unit === 'g' || unit === 'ml') {
      pricePerUnit =
        (price / (amount / 1000)).toFixed(2) +
        (unit === 'ml' ? ' €/l' : ' €/kg');
    }
    else {
      pricePerUnit = (price / amount).toFixed(2) + ' €/' + unit;
    }
    if (parseFloat(pricePerUnit) === price) {
      return null;
    }
    return pricePerUnit;
  }
  return null;
}

export function lettersToNumbers(barcode: string): string {
  return barcode
    .replace(/ą/g, '1')
    .replace(/č/g, '2')
    .replace(/ę/g, '3')
    .replace(/ė/g, '4')
    .replace(/į/g, '5')
    .replace(/š/g, '6')
    .replace(/ų/g, '7')
    .replace(/ū/g, '8')
    .replace(/ž/g, '9')
}

export function getFriendlyTime(lastChanged: string): string | null {
  if (!lastChanged) {
    return null
  }
  const now = new Date()
  const changedDate = new Date(
    new Date(lastChanged).getTime() - new Date().getTimezoneOffset() * 60000,
  ) // Adjust for timezone offset

  const diffMs = now.getTime() - changedDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  // Needs to be rewritten using frappe translations
  if (diffDays > 60) {
    return null
  } else if (diffDays > 30) {
    return 'oneMonthAgo'
  } else if (diffDays > 21) {
    return 'threeWeeksAgo'
  } else if (diffDays > 14) {
    return 'twoWeeksAgo'
  } else if (diffDays > 1) {
    return 'daysAgo' + diffDays.toString()
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffHours >= 1) {
    return 'hoursAgo' + diffHours.toString()
  } else {
    return 'minutesAgo' + diffMinutes.toString()
  }
}

export function isItRecent(lastChanged: string): boolean {
  const now = new Date()
  const changedDate = new Date(lastChanged)
  const diffMs = now.getTime() - changedDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays < 1
}

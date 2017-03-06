/**
 * @file edtf-humanizer.ts
 *
 * Concept and some parts taken from the works of Cory Lown at Duke Universiy
 * url: https://github.com/duke-libraries/edtf-humanize
 **/
import * as dateformat from 'dateformat';
const edtf = require('edtf');

export class EdtfHumanizer {

  private date: any;

  day_precision_format = "UTC:mmmm d, yyyy"
  month_precision_format = "UTC:mmmm yyyy"
  year_precision_format = "UTC:yyyy"

  approximate_date_prefix = "approximately "

  uncertain_date_suffix = "?"

  decade_suffix = "s"
  century_suffix = "s"

  unspecified_digit_substitute = "0"
  unspecified_digit_suffix = "s"

  interval_connector = "-"
  interval_unspecified_suffix = "s"

  set_dates_connector = ", "
  set_last_date_connector = " or "
  set_two_dates_connector = " or "

  list_dates_connector = ", "
  list_last_date_connector = " and "
  list_two_dates_connector = " and "

  unknown = "unknown"

  seasons = {
    21: 'Spring',
    22: 'Summer',
    23: 'Fall',
    24: 'Winter'
  }

  constructor(date: string) {
    try {
      this.date = edtf(date);
    }
    catch(e) {
      this.date = null;
    }
  }

  humanize(): string {
    if (!this.date) {
      return this.unknown;
    }

    switch(this.date.type) {
      case 'Century':
        return this.humanizeCentury();
      case 'Decade':
        return this.humanizeDecade();
      case 'Date':
        return this.humanizeDate();
      case 'Interval':
        return this.humanizeInterval();
      case 'Season':
        return this.humanizeSeason();
      case 'List':
        return this.humanizeList();
      case 'Set':
        return this.humanizeSet();
    }

    return this.unknown;
  }

  private humanizeCentury(): string {
    return this.date.year + this.century_suffix;
  }

  private humanizeDecade(): string {
    return this.date.decade + this.decade_suffix;
  }

  private humanizeDate(): string {
    return this.approximate(this.date) + this.simpleDate(this.date);
  }

  private humanizeInterval(): string {
    return this.approximate(this.date.lower) +
      this.simpleDate(this.date.lower) +
      this.interval_connector +
      this.approximate(this.date.upper) +
      this.simpleDate(this.date.upper);
  }

  private humanizeSeason(): string {
    return this.approximate(this.date) +
      this.seasons[this.date.season] + ' ' +
      this.date.year + this.uncertain(this.date);
  }

  private humanizeList(): string {
    let dates = this.iterateDate(this.date);
    if (dates.length === 2) {
      return dates.join(this.list_two_dates_connector);
    }
    return dates.join(this.list_dates_connector)
      .replace(/,\s([^,]+)$/, this.list_last_date_connector + '$1');
  }

  private humanizeSet(): string {
    let dates = this.iterateDate(this.date);
    let earlier = (this.date.earlier) ? 'Before ' : '';
    let later = (this.date.later) ? ' and later' : '';

    if (dates.length === 2) {
      return earlier + dates.join(this.set_two_dates_connector) + later;
    }
    return earlier + dates.join(this.set_dates_connector)
      .replace(/,\s([^,]+)$/, this.set_last_date_connector + '$1') + later;
  }

  private simpleDate(date: any): string {
    return this.unspecifiedYear(date) + this.uncertain(date);
  }

  private unspecifiedYear(date: any): string {
    let d = this.datePrecision(date);
    if (date.unspecified && date.unspecified.is('year')) {
      let yearSub = this.yearPrecision(date).replace(/X/g,
        this.unspecified_digit_substitute) + this.unspecified_digit_suffix;
      d = d.replace(date.year, yearSub);
    }
    return d;
  }

  private uncertain(date: any): string {
    if (date.uncertain && date.uncertain.value) {
      return this.uncertain_date_suffix;
    }
    return '';
  }

  private approximate(date: any): string {
    if (date.approximate && date.approximate.value) {
      return this.approximate_date_prefix;
    }
    return '';
  }

  private datePrecision(date: any): string {
    switch(date.precision) {
      case 1: // 2017
        return dateformat(date, this.year_precision_format);
      case 2: // 2017-12
        return dateformat(date, this.month_precision_format);
      case 3: // 2017-12-25
        return dateformat(date, this.day_precision_format);
    }
    return '';
  }

  private yearPrecision(date: any): string {
    let stringValues = date.values.map((value) => {
      return value.toString();
    });
    return date.unspecified.masks(stringValues)[0];
  }

  private iterateDate(date: any): string[] {
    let list = [];
    for(let d of date) {
      list.push(this.approximate(d) + this.simpleDate(d));
    }
    return list;
  }


}

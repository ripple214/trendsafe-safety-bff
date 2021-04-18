import moment from "moment";

const FORMAT_ISO = 'YYYY-MM-DDTHH:mm:ssTZD';
const FORMAT_LONG = 'MMMM DD, YYYY hh:mm:ss';
const FORMAT_SHORT = 'YYYY-MM-DD';
const FORMAT_MONTH = 'YYYY-MM';

export const dateParse = (dateString: string, dateFormat: string = FORMAT_LONG): moment.Moment => {
  let dateVal = moment(dateString, dateFormat);
  if(!dateVal.isValid()) {
    dateVal = moment(dateString, FORMAT_ISO);
  }
  return dateVal;
}

export const dateFormat = (date: any, dateFormat: string = FORMAT_SHORT) => {
  return moment(date).format(dateFormat);
}

export const isAfter = (dateString1: string, dateString2: string, dateFormat: string = FORMAT_LONG) => {
  return dateParse(dateString1, dateFormat).isAfter(dateParse(dateString2, dateFormat));
}

export const isBefore = (dateString1: string, dateString2: string, dateFormat: string = FORMAT_LONG) => {
  return dateParse(dateString1, dateFormat).isBefore(dateParse(dateString2, dateFormat));
}

export const isSameMonth = (dateString1: string, dateString2: string) => {
  return dateParse(dateString1, FORMAT_LONG).isSame(dateParse(dateString2, FORMAT_MONTH), 'month');
}

export const isWithin = (dateString: string, dateStringFrom: string, dateStringTo: string, unit: moment.unitOfTime.StartOf = 'day', dateFormat: string = FORMAT_LONG):boolean => {
  let dateToCompare = dateParse(dateString, dateFormat);
  //console.log("dateToCompare", dateToCompare, dateString);
  return dateToCompare.isSameOrAfter(dateStringFrom, unit) && dateToCompare.isSameOrBefore(dateStringTo, unit);
}

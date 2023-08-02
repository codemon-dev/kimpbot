
export function elapsedTime(date1: number, date2?: number) {
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  if (!date1) {
    return ''
  }
  const startDate: any = new Date(date1);
  const endDate: any = date2 ? new Date(date2): new Date();

  const timeDiffInMs = endDate - startDate;

  const seconds = Math.floor(timeDiffInMs / 1000) % 60;
  const minutes = Math.floor(timeDiffInMs / (1000 * 60)) % 60;
  const hours = Math.floor(timeDiffInMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(timeDiffInMs / (1000 * 60 * 60 * 24));
  
  const startDateFormatted = dateFormatter.format(startDate);
  const endDateFormatted = dateFormatter.format(endDate);
  const startTimeFormatted = timeFormatter.format(startDate);
  const endTimeFormatted = timeFormatter.format(endDate);

  return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
}

export function convertLocalTime(date: number) {
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
}

export function convertChartMarker(date: number) {
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  //return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
  return `${timeFormatter.format(date)}`;
}

export function convertChartLable(date: number) {
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${dateFormatter.format(date)}`;
}
  
  
export function convertToLogFormatDate(timestamp: number) {
  const date = new Date(timestamp);

  // Get individual components
  const year = date.getFullYear().toString().slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hour = ("0" + date.getHours()).slice(-2);
  const minute = ("0" + date.getMinutes()).slice(-2);
  const second = ("0" + date.getSeconds()).slice(-2);

  // Format the date and time
  const formattedDate = `${year}-${month}-${day}_${hour}-${minute}-${second}`;

  return formattedDate;
}
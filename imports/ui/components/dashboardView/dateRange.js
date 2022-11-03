class DateRange {
  constructor(rangeLabel = 'month', rangeMultiplier = 1, shift = 0) {

    // Case of halfAMonth
    if (rangeLabel === 'halfAMonth') {

      this.startTime = moment().startOf('month');
      if (moment().date() >= 16) {
        this.startTime.add(15, 'days');
      }

    } else {

      this.startTime = moment().startOf(rangeLabel);
      if (shift) {
         this.startTime = moment(this.startTime).add(shift, rangeLabel);
      }

    }


    if (!shift) {
      this.endTime = moment();
    } else {
      if (rangeLabel === 'month') {
        this.endTime = moment(this.startTime).endOf(rangeLabel);
      } else if (rangeLabel === 'halfAMonth') {
        if (this.startTime.date() === 1) {
          this.endTime = moment(this.startTime).add(15, 'days');
        } else {
          this.endTime = moment(this.startTime).endOf('month');
        }
      } else {
        throw "rangeLabel not supported yet";
      }
    }

    this.startTime = this.startTime.toDate();
    this.endTime = this.endTime.toDate();

    this.rangeLabel = rangeLabel;
    console.log({start: this.startTime, end: this.endTime, rangeLabel: this.rangeLabel});
  }

  getFindFilter() {
    return {
      startTime: {$gte: this.startTime},
      endTime: {$lte: this.endTime}
    }
  }

  previousDateRange() {
    return new DateRange(this.rangeLabel, -1);
  }
}

export {DateRange};

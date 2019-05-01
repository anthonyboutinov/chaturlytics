import { DataPoints } from '/imports/api/datapoints/datapoints.js';

GroupingDelegate = class {

  constructor(originalGrouping) {

    // Constructor: private methods
    //

    function _getFromToRounded(descriptiveGroupingInterval) {
      // Note: This function is the second most computationally expensive piece of code here
      //// TODO: Store temporarely with short expiration time (14 min)

      const edgeDataPointQuery = { startTime: {$exists: true} };
      const firstOne = DataPoints.findOne(edgeDataPointQuery, {
        sort: {endTime: 1},
        limit: 1,
        fields: {endTime: 1}
      });
      if (!firstOne) {
        return;
      }
      const lastOne = DataPoints.findOne(edgeDataPointQuery, {
        sort: {endTime: -1},
        limit: 1,
        fields: {endTime: 1}
      });

      let fromRounded = moment(firstOne.endTime)
        .set('hour', 0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0);
      const lastDatetimeRounded = moment(lastOne.endTime)
        .set('hour', 0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0)
        .add(1, 'days');

      if (descriptiveGroupingInterval === 'months' || descriptiveGroupingInterval === 'halvesOfMonth') {
        fromRounded = fromRounded.startOf('month');
      } else if (descriptiveGroupingInterval === 'years') {
        fromRounded = fromRounded.startOf('year');
      } else if (descriptiveGroupingInterval === 'weeks') {
        fromRounded = fromRounded.startOf('week');
      }
      return {fromRounded, lastDatetimeRounded};
    }

    function _isPrimitiveGrouping(groupingInterval) {
      return groupingInterval === 'days'
          || groupingInterval === 'weeks'
          || groupingInterval === 'months'
          || groupingInterval === 'years';
    }

    function _computedGroupingInterval(groupingInterval) {
      if (!_isPrimitiveGrouping(groupingInterval)) {
        groupingInterval = groupingInterval === 'halvesOfMonth' ? 'days' : null;
      }
      if (!groupingInterval) {
        throw 'This Grouping is not covered';
      }
      return groupingInterval;
    }

    function _groupingStep(groupingInterval) {
      const groupingStep = _isPrimitiveGrouping(groupingInterval) ? 1 :
        groupingInterval === 'halvesOfMonth' ? 15 : null;
      if (!groupingStep) {
        throw 'This Grouping is not covered';
      }
      return groupingStep;
    }

    //
    // Constructor: eof private methods.


    this.originalGrouping = originalGrouping;
    this.fromToRounded = _getFromToRounded(originalGrouping);
    if (!this.fromToRounded.fromRounded) {
      return;
      // Pointless to continue
    }

    this.groupingInterval = _computedGroupingInterval(originalGrouping);
    this.groupingStep = _groupingStep(originalGrouping);
    this.doSwap = originalGrouping === 'halvesOfMonth';
    this.swapHandle = this.fromToRounded.fromRounded.date() >= 15;

    console.log("GroupingDelegate instance successfully constructed");
  }

  shouldContinue() {
    if (!this.fromToRounded) {
      return false;
    }
    this._closePreviousIteration();
    const shouldContinue = moment.max(this.fromToRounded.fromRounded, this.fromToRounded.lastDatetimeRounded) === this.fromToRounded.lastDatetimeRounded;
    if (shouldContinue) {
      this._setToRounded();
    }
    return shouldContinue;
  }

  lowerDateRange() {
    return this.fromToRounded.fromRounded.toDate();
  }

  upperDateRange () {
    return this.toRounded.toDate();
  }


  // PRIVATE METHODS
  //

  _setToRounded() {
    if (this.doSwap) {

      if (this.swapHandle) {
        this.toRounded = moment(this.fromToRounded.fromRounded).date(1).add(1, 'month');
      } else {
        // mimic default behaviour
        this.toRounded = moment(this.fromToRounded.fromRounded).add(this.groupingStep, this.groupingInterval);
        if (this.toRounded.date() >= 28) {
          this.toRounded = moment(this.fromToRounded.fromRounded).date(1).add(1, 'month');
        } else if (this.toRounded.date() > 1 && this.toRounded.date() <= 3) {
          this.toRounded = this.toRounded.set('date', 1);
        }
      }
      this.swapHandle != this.swapHandle;
    } else {
      // console.log({this.fromToRounded, groupingStep, groupingInterval});
      this.toRounded = moment(this.fromToRounded.fromRounded).add(this.groupingStep, this.groupingInterval);
    }
  }

  _closePreviousIteration() {
    // if toRounded exists, set fromRounded to it
    if (this.toRounded) {
      this.fromToRounded.fromRounded = this.toRounded;
      // this.toRounded = null; // this is probably redundant
    }
  }

};

export { GroupingDelegate };

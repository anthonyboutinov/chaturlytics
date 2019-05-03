import { DataPoints } from '/imports/api/datapoints/datapoints.js';


/*
  Public stuff:
    constructor (_)
    - var lowerMoment
    - var upperMoment
    + method Boolean shouldContinue()

  How to use:
    const i = new GroupingDelegate(_);
    while (i.shouldContinue()) {
      ...
    }
*/
GroupingDelegate = class {

  constructor(originalGrouping, descriptiveDaterange) {

    // Constructor: private methods
    //

    function _descriptiveDaterangeSearchQuery(descriptiveDaterange) {
      const query = {
        startTime: {$exists: true},
      };
      if (descriptiveDaterange !== 'allTime') {
        var daterangeMonths;
        switch (descriptiveDaterange) {
          case '1month':
            daterangeMonths = 1;
            break;
          case '3months':
            daterangeMonths = 3;
            break;
          case '6months':
            daterangeMonths = 6;
            break;
          case '12months':
            daterangeMonths = 12;
            break;
          default:
            console.warn('Invalid case');
            return query;
        }
        query.endTime = {$gte: moment().startOf('day').subtract(daterangeMonths, 'months').toDate()};
      }
      return query;
    }

    function _getLowerMoment(descriptiveGroupingInterval, descriptiveDaterange) {
      // Note: This function is the second most computationally expensive piece of code here
      //// TODO: Store temporarely with short expiration time (14 min)

      const firstOne = DataPoints.findOne(_descriptiveDaterangeSearchQuery(descriptiveDaterange), {
        sort: {endTime: 1},
        limit: 1,
        fields: {endTime: 1}
      });
      if (!firstOne) {
        return null;
      }

      let lowerMoment = moment(firstOne.endTime)//.startOf('day');
        .set('hour', 0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0);

      if (descriptiveGroupingInterval === 'months' || descriptiveGroupingInterval === 'halvesOfMonth') {
        lowerMoment = lowerMoment.startOf('month');
      } else if (descriptiveGroupingInterval === 'years') {
        lowerMoment = lowerMoment.startOf('year');
      } else if (descriptiveGroupingInterval === 'weeks') {
        lowerMoment = lowerMoment.startOf('week');
      }
      return lowerMoment;
    }

    function _getLastMomentRounded(descriptiveDaterange) {
      const lastOne = DataPoints.findOne(_descriptiveDaterangeSearchQuery(descriptiveDaterange), {
        sort: {endTime: -1},
        limit: 1,
        fields: {endTime: 1}
      });
      return moment(lastOne.endTime)//.endOf('day');
        .set('hour', 0)
        .set('minute', 0)
        .set('second', 0)
        .set('millisecond', 0)
        .add(1, 'days');
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
    this.lowerMoment = _getLowerMoment(originalGrouping, descriptiveDaterange);
    if (!this.lowerMoment) {
      console.warn("No initial datapoint found when grouping");
      return;
      // Pointless to continue
    }
    this.lastMomentRounded = _getLastMomentRounded(descriptiveDaterange);

    this.groupingInterval = _computedGroupingInterval(originalGrouping);
    this.groupingStep = _groupingStep(originalGrouping);
    this.doSwap = originalGrouping === 'halvesOfMonth';
    this.swapHandle = this.lowerMoment.date() >= 15;

    console.log("GroupingDelegate instance successfully constructed");
  }

  shouldContinue() {
    if (!this.lowerMoment) {
      return false;
    }
    this._closePreviousIteration();
    const shouldContinue = moment.max(this.lowerMoment, this.lastMomentRounded) === this.lastMomentRounded;
    if (shouldContinue) {
      this._setToRounded();
    }
    return shouldContinue;
  }

  // PRIVATE METHODS
  //

  _setToRounded() {
    if (this.doSwap) {

      if (this.swapHandle) {
        this.upperMoment = moment(this.lowerMoment).date(1).add(1, 'month');
      } else {
        // mimic default behaviour
        this.upperMoment = moment(this.lowerMoment).add(this.groupingStep, this.groupingInterval);
        if (this.upperMoment.date() >= 28) {
          this.upperMoment = moment(this.lowerMoment).date(1).add(1, 'month');
        } else if (this.upperMoment.date() > 1 && this.upperMoment.date() <= 3) {
          this.upperMoment = this.upperMoment.set('date', 1);
        }
      }
      this.swapHandle != this.swapHandle;
    } else {
      // console.log({this.lowerMoment, groupingStep, groupingInterval});
      this.upperMoment = moment(this.lowerMoment).add(this.groupingStep, this.groupingInterval);
    }
  }

  _closePreviousIteration() {
    // if upperMoment exists, set lowerMoment to it
    if (this.upperMoment) {
      this.lowerMoment = this.upperMoment;
      // this.upperMoment = null; // this is probably redundant
    }
  }

};

export { GroupingDelegate };

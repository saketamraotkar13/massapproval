const cds = require('@sap/cds');

class MyOrderApprovalService extends cds.ApplicationService {
  async init() {
    await super.init();

    const { Orders, reasonCodeVH } = this.entities;

    this.on('approveOrders', async (req) => {
      let { orders, approveLoad, reasonCode, filters } = req.data;

      // --- Validation: approveLoad is mandatory
      if (approveLoad === undefined || approveLoad === null) {
        return req.error(400, 'Parameter "approveLoad" is mandatory.');
      }

      // --- Validation: reasonCode mandatory if approveLoad === false
      if (approveLoad === false && (!reasonCode || reasonCode.trim() === '')) {
        return req.error(400, 'Reason Code is mandatory when approveLoad is false !!!');
      }

      // --- Validation: reasonCode existence check if provided
      if (reasonCode) {
        const exists = await SELECT.one.from(reasonCodeVH).where({ reasonCode });
        if (!exists) {
          return req.error(400, `Invalid Reason Code "${reasonCode}". It does not exist in Reason Code Value Help table.`);
        }
      }

      // --- Handle filters (Approve All Filtered Orders)
      if (filters) {
        filters = JSON.parse(filters);
        const whereConditions = {};

        if (filters.category) whereConditions.category = filters.category;
        if (filters.status) whereConditions.status = filters.status;
        if (filters.sourceLocation) whereConditions.sourceLocation = filters.sourceLocation;
        if (filters.destinationLocation) whereConditions.destinationLocation = filters.destinationLocation;
        if (filters.dateFrom && filters.dateTo) {
          whereConditions.orderDate = { ">=": filters.dateFrom, "<=": filters.dateTo };
        }

        // Select matching order numbers from DB
        const rows = await SELECT.from(Orders)
          .where(whereConditions)
          .columns(['orderNumber']);

        orders = rows.map(r => r.orderNumber);
      }

      // --- Validation: no orders found
      if (!orders || orders.length === 0) {
        return req.error(400, 'No orders to update.');
      }

      // --- Update orders in DB
      const updateData = { approveLoad };
      if (reasonCode) updateData.reasonCode_ID = reasonCode; // adjust flattened association name if needed

      await UPDATE(Orders)
        .set(updateData)
        .where({ orderNumber: { in: orders } });

      return { success: true, message: `${orders.length} orders updated successfully.` };
    });
  }
}

module.exports = MyOrderApprovalService;

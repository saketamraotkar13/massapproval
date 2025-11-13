sap.ui.define([ 
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "sap/m/CheckBox",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/ToolbarSpacer"
], (Controller, MessageToast, MessageBox, Dialog, Label, ComboBox, Item, CheckBox, Button, VBox, HBox, ToolbarSpacer) => {
    "use strict";

    return Controller.extend("ui5massapproval.controller.View1", {

        _getSelectedOrders: function () {
            const oSmartTable = this.byId("smartTable");
            const oTable = oSmartTable.getTable();
            let aContexts = [];

            if (oTable.getSelectedIndices) {
                aContexts = oTable.getSelectedIndices()
                    .map(i => oTable.getContextByIndex(i))
                    .filter(ctx => ctx);
            } else if (oTable.getSelectedItems) {
                aContexts = oTable.getSelectedItems()
                    .map(item => item.getBindingContext())
                    .filter(ctx => ctx);
            }

            return aContexts.map(ctx => ctx.getProperty("orderNumber"));
        },

        _getSmartFilterData: function () {
            const oSmartFilterBar = this.byId("smartFilterBar");
            return oSmartFilterBar.getFilters() || {};
        },

        onApproveSelected: function () {
            const oSmartTable = this.byId("smartTable");
            const oModel = this.getView().getModel();
            const sServiceUrl = oModel.sServiceUrl + "/approveOrders";

            let aSelectedOrders = this._getSelectedOrders();
            let iSelectedCount = aSelectedOrders.length;

            // Selected count label
            const oSelectedCountLabel = new Label({
                text: `Selected Orders: ${iSelectedCount}`,
                wrapping: true
            });

            // Approve Load checkbox
            const oApproveCheck = new CheckBox("approveCheck", { text: "Approve Load", selected: true });

            // Apply to all filtered records checkbox
            const oApplyAllCheck = new CheckBox("applyToAllCheck", { text: "Apply to all filtered records" });

            // Reason Code label and ComboBox inside HBox
            const oReasonLabel = new Label({ text: "Select Reason Code", labelFor: "reasonCombo", width: "150px" });
            const oReasonCombo = new ComboBox("reasonCombo", {
                width: "calc(100% - 160px)",
                placeholder: "--Select Reason Code--",
                items: {
                    path: "/reasonCodeVH",
                    template: new Item({ key: "{reasonCode}", text: "{reasonCode}" })
                }
            });
            const oReasonHBox = new HBox({
                width: "100%",
                alignItems: "Center",
                renderType: "Bare",
                items: [oReasonLabel, oReasonCombo]
            });

            // VBox to contain all content vertically
            const oVBox = new VBox({
                width: "100%",
                renderType: "Bare",
                items: [
                    oSelectedCountLabel,
                    oApproveCheck,
                    oApplyAllCheck,
                    oReasonHBox
                ],
                justifyContent: "Start",
                alignItems: "Stretch",
                renderType: "Bare",
                layoutData: new sap.m.FlexItemData({ growFactor: 1 })
            });

            const oDialog = new Dialog({
                title: "Approve Orders",
                contentWidth: "500px",
                content: [oVBox],
                beginButton: new Button({
                    text: "Save",
                    type: "Emphasized",
                    press: () => {
                        const bApproveLoad = oApproveCheck.getSelected();
                        const sReason = oReasonCombo.getSelectedKey();
                        const bApplyAll = oApplyAllCheck.getSelected();

                        if (!bApproveLoad && !sReason) {
                            MessageToast.show("Reason Code is mandatory when Approve Load is unchecked.");
                            return;
                        }

                        oDialog.close();

                        const payload = {
                            approveLoad: bApproveLoad,
                            reasonCode: sReason || "",
                            orders: [],
                            filters: null
                        };

                        if (bApplyAll) {
                            payload.filters = JSON.stringify(this._getSmartFilterData());
                        } else {
                            if (iSelectedCount === 0) {
                                MessageToast.show("Please select at least one order.");
                                return;
                            }
                            payload.orders = aSelectedOrders;
                        }

                        // Call CAP action
                        $.ajax({
                            url: sServiceUrl,
                            method: "POST",
                            contentType: "application/json",
                            data: JSON.stringify(payload),
                            success: (oData) => {
                                MessageToast.show(oData?.message || "Orders updated successfully.");
                                oSmartTable.rebindTable();
                            },
                            error: (oErr) => {
                                const sMsg = oErr.responseJSON?.error?.message || "Error updating orders.";
                                MessageBox.error(sMsg);
                            }
                        });
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: () => oDialog.close()
                }),
                afterClose: () => oDialog.destroy()
            });

            // Hide/Show selected count based on "Apply to all filtered records"
            oApplyAllCheck.attachSelect(() => {
                oSelectedCountLabel.setVisible(!oApplyAllCheck.getSelected());
            });

            oDialog.setModel(oModel);
            oDialog.open();
        }

    });
});

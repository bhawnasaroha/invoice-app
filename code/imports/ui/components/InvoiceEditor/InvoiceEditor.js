/* eslint-disable max-len, no-return-assign */

import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, FormGroup, ControlLabel, Button, ListGroup, ListGroupItem, Panel, Alert } from 'react-bootstrap';
import moment from 'moment';
import CurrencyInput from 'react-currency-input';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import SelectRecipient from '../SelectRecipient/SelectRecipient';
import DateTimePicker from '../DateTimePicker/DateTimePicker';
import validate from '../../../modules/validate';
import { currencyToFloat, formatAsCurrency, calculateAndFormatTotal, centsToDollars } from '../../../modules/currency-conversions';

import './InvoiceEditor.scss';

class InvoiceEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = props.invoice ? {
      recipient: props.invoice.recipientId,
      due: moment(props.invoice.due),
      lineItems: props.invoice.lineItems,
      taxItems: props.invoice.taxItems,
    } : {
      recipient: null,
      due: moment(),
      lineItems: [{
        _id: Random.id(),
        description: '',
        quantity: 1,
        amount: 0,
      }],
      taxItems: [{
        _id: Random.id(),
        description: '',
        amount: 0,
      }],
    };
    console.log('this.state.taxItems');
    console.log(props);
    console.log(this.state);
    console.log(this.state.lineItems);
    console.log(this.state.taxItems);

    this.handleSubmit = this.handleSubmit.bind(this);
    // this.handleChange = this.handleChange.bind(this);
    this.updateLineItem = this.updateLineItem.bind(this);
    this.calculateInvoiceTotal = this.calculateInvoiceTotal.bind(this);
    this.handleSendInvoice = this.handleSendInvoice.bind(this);
    this.calculateTaxAmt = this.calculateTaxAmt.bind(this);
    this.calculateGrandTotal = this.calculateGrandTotal.bind(this);
    this.changeTax = this.changeTax.bind(this);
  }

  componentDidMount() {
    const component = this;
    validate(component.form, {
      rules: {
        due: {
          required: true,
        },
        subject: {
          required: true,
        },
      },
      messages: {
        due: {
          required: 'When is this due?',
        },
        subject: {
          required: 'What is this invoice for?',
        },
      },
      submitHandler() { component.handleSubmit(); },
    });
  }

  getAmountAsFloat(amount) {
    // This handles conversion of the String value we get when editing an invoice as well as
    // converting the cents value we store in the DB back to dollars. Both scenarios must be
    // accounted for as we're reusing <InvoiceEditor /> in both creating and editing invoices.
    return typeof amount === 'string' ? currencyToFloat(amount) : centsToDollars(amount);
  }

  updateLineItem(event, _id) {
    const { name, value } = event.target;
    const lineItems = [...this.state.lineItems];
    const itemToUpdate = _.findWhere(lineItems, { _id });
    itemToUpdate[name] = name === 'amount' ? this[`amount_${_id}`].getMaskedValue() : value;
    this.setState({ lineItems });
  }

  updateTaxItem(event, _id) {
    const { name, value } = event.target;
    const taxItems = [...this.state.taxItems];
    const itemToUpdate = _.findWhere(taxItems, { _id });
    console.log('item to update tax');
    console.log(itemToUpdate);
    itemToUpdate[name] = name === 'amount' ? this[`amount_${_id}`].getMaskedValue() : value;
    this.setState({ taxItems });
    console.log(this.state.taxItems);
  }

  calculateInvoiceTotal() {
    let total = 0;
    this.state.lineItems.map(({ quantity, amount }) => (
      total += (quantity * this.getAmountAsFloat(amount))
    ));
    return formatAsCurrency(total);
  }

  calculateTaxAmt(_id) {
    const total = this.calculateInvoiceTotal();
    const taxItems = { ...this.state.taxItems };
    console.log(taxItems);
    let taxAmount = taxItems.amount;
    console.log('TAXAMOUNT');
    console.log(taxAmount);
    let totalTax = 0;
    this.state.taxItems.map(() => (
      taxAmount = ((this[`amount_${_id}`] * this.getAmountAsFloat(total)) / 100),
      totalTax += taxAmount
    ));
    console.log('total');
    console.log(this.getAmountAsFloat(total));
    console.log('taxAmount');
    console.log(taxAmount);
    return formatAsCurrency(taxAmount);
  }

  calculateGrandTotal() {
    const total = this.calculateInvoiceTotal();
    console.log(total);
    const taxAmount = this.calculateTaxAmt();
    const grandTotal = this.getAmountAsFloat(total) + this.getAmountAsFloat(taxAmount);
    console.log('grandtotal');
    console.log(grandTotal);
    return formatAsCurrency(grandTotal);
  }

  handleSendInvoice() {
    if (confirm(`Send this invoice now? We\'ll send it to all of the conctacts of the specified recipient.`)) {
      this.handleSubmit(true); // Pass true to toggle this as isSending.
    }
  }

  changeTax(e) {
    console.log('###e');
    console.log(e.target.value);
    console.log('ID');
    console.log(this.state.taxItems[0]._id);
    console.log(this.state.taxItems);
    const taxItem = [...this.state.taxItems];
    console.log('TAXITEM');
    console.log(taxItem);
    taxItem[0].amount = e.target.value;
    this.setState({ taxItems: taxItem });
    console.log(this.state.taxItems);
  }

  handleSubmit(isSending) {
    const { history } = this.props;
    const existingInvoice = this.props.invoice && this.props.invoice._id;
    const methodToCall = existingInvoice ? 'invoices.update' : 'invoices.insert';
    const invoice = {
      recipientId: this.state.recipient,
      due: this.state.due.format(),
      subject: this.subject.value.trim(),
      lineItems: this.state.lineItems.map(({ _id, description, quantity, amount }) => {
        return {
          _id,
          description,
          quantity: parseInt(quantity, 10),
          amount: (this.getAmountAsFloat(amount) * 100),
        };
      }),
      taxItems: this.state.taxItems.map(({ _id, description, amount }) => { 
        return {
          _id,
          description,
          amount: (this.getAmountAsFloat(amount / 100)),
        };
      }),
      notes: this.notes.value.trim(),
      isSending,
    };

    if (existingInvoice) invoice._id = existingInvoice;

    Meteor.call(methodToCall, invoice, (error, invoiceId) => {
      if (error) {
        Bert.alert(error.reason, 'danger');
      } else {
        const confirmation = existingInvoice ? 'Invoice updated!' : 'Invoice created!';
        this.form.reset();
        Bert.alert(isSending ? 'Invoice sent!' : confirmation, 'success');
        history.push(`/invoices/${invoiceId}`);
      }
    });
  }

  render() {
    const { invoice } = this.props;
    return (<div className="InvoiceEditor">
      <Row>
        <Col xs={12} sm={10} smOffset={1}>
          <h4 className="page-header">Invoice #{invoice && invoice.number}</h4>
          <form ref={form => (this.form = form)} onSubmit={event => event.preventDefault()}>
            <Row>
              <Col xs={12} sm={6}>
                <FormGroup>
                  <ControlLabel>Recipient</ControlLabel>
                  <SelectRecipient
                    name="recipient"
                    value={this.state.recipient}
                    onSelect={option => this.setState({ recipient: (option && option.value) || null })}
                  />
                </FormGroup>
              </Col>
              <Col xs={12} sm={6}>
                <FormGroup>
                  <ControlLabel>Due Date</ControlLabel>
                  <DateTimePicker
                    value={this.state.due}
                    dateFormat="MMMM Do, YYYY"
                    timeFormat={false}
                    inputProps={{ name: 'due' }}
                    onChange={due => this.setState({ due })}
                  />
                </FormGroup>
              </Col>
            </Row>
            <FormGroup>
              <ControlLabel>Subject</ControlLabel>
              <input
                type="text"
                className="form-control"
                name="subject"
                ref={subject => (this.subject = subject)}
                defaultValue={invoice && invoice.subject}
                placeholder="Wiring up MySQL database with GraphQL server"
              />
            </FormGroup>
            <FormGroup>
              <ControlLabel>Line Items</ControlLabel>
              {this.state.lineItems.length > 0 ? <ListGroup className="LineItems">
                {this.state.lineItems.map(({ _id, description, quantity, amount }) => (
                  <ListGroupItem key={_id} className="clearfix">
                    <Row>
                      <Col xs={12} sm={6}>
                        <button
                          className="remove-line-item"
                          onClick={(event) => {
                            event.preventDefault();
                            const lineItems = [...this.state.lineItems].filter(item => item._id !== _id);
                            this.setState({ lineItems });
                          }}
                        >
                          <i className="fa fa-remove" />
                        </button>
                        <input
                          type="text"
                          name="description"
                          className="form-control"
                          value={description}
                          placeholder="Write GraphQL schema"
                          onChange={event => this.updateLineItem(event, _id)}
                        />
                      </Col>
                      <Col xs={12} sm={2}>
                        <input
                          type="text"
                          className="form-control text-center"
                          name="quantity"
                          value={quantity}
                          onChange={event => this.updateLineItem(event, _id)}
                        />
                      </Col>
                      <Col xs={12} sm={2}>
                        <CurrencyInput
                          type="text"
                          name="amount"
                          className="form-control text-center"
                          ref={amountInput => this[`amount_${_id}`] = amountInput}
                          prefix="$"
                          value={this.getAmountAsFloat(amount)}
                          onChangeEvent={event => this.updateLineItem(event, _id)}
                        />
                      </Col>
                      <Col xs={12} sm={2}>
                        <div className="total">
                          <span>
                            {calculateAndFormatTotal(quantity, this.getAmountAsFloat(amount))}
                          </span>
                        </div>
                      </Col>
                    </Row>
                  </ListGroupItem>
                ))}
              </ListGroup> : <Alert>{'You need to add at least one line item. Add an item by clicking "Add Item" below.'}</Alert>}
              <Row>
                <Col xs={6}>
                  <Button
                    bsStyle="default"
                    className="AddItem"
                    onClick={() => {
                      const lineItems = [...this.state.lineItems];
                      lineItems.push({ _id: Random.id(), description: '', quantity: 1, amount: 0 });
                      this.setState({ lineItems });
                    }}
                  >
                    <i className="fa fa-plus" /> Add Item
                  </Button>
                </Col>
                <Col xs={6}>
                  <p className="InvoiceTotal">
                    <strong>Total</strong>
                    <span>{this.calculateInvoiceTotal()}</span>
                  </p>
                </Col>
              </Row>
            </FormGroup>
            {/* tax items */}
            <FormGroup>
              <ControlLabel>Add Tax Items</ControlLabel>
              {this.state.taxItems.length > 0 ? <ListGroup className="TaxItems">
                {this.state.taxItems.map(({ _id, description }) => (
                  <ListGroupItem key={_id} className="clearfix">
                    <Row>
                      <Col xs={12} sm={8}>
                        <ControlLabel>Taxes</ControlLabel>
                        <button
                          className="remove-line-item"
                          onClick={(event) => {
                            event.preventDefault();
                            const taxItems = [...this.state.taxItems].filter(item => item._id !== _id);
                            this.setState({ taxItems });
                          }}
                        >
                          <i className="fa fa-remove" />
                        </button>
                        <input
                          type="text"
                          name="description"
                          className="form-control"
                          value={description}
                          placeholder="Write GraphQL schema"
                          onChange={event => this.updateTaxItem(event, _id)}
                        />
                      </Col>
                      <Col xs={12} sm={2}>
                        <ControlLabel>Tax in %</ControlLabel>
                        {/* <input
                          type="text"
                          name="amount"
                          className="form-control text-center"
                          value={this.state.taxItems.amount}
                          onChange={event => this.changeTax(event)}
                        /> */}
                        <input
                          type="text"
                          name="amount"
                          className="form-control text-center"
                          value={this.state.taxItems.amount}
                          onChange={event => this.updateTaxItem(event, _id)}
                        />
                      </Col>
                      <Col xs={12} sm={2}>
                        <ControlLabel>Tax Amount</ControlLabel>
                        <div className="total">
                          <span>
                            {this.calculateTaxAmt()}
                          </span>
                        </div>
                      </Col>
                    </Row>
                  </ListGroupItem>
                ))}
              </ListGroup> : <Alert>{'You need to add at least one tax item. Add an item by clicking "Add Item" below.'}
              </Alert>}
              <Row>
                <Col xs={6}>
                  <Button
                    bsStyle="default"
                    className="AddItem"
                    onClick={() => {
                      const taxItems = [...this.state.taxItems];
                      taxItems.push({ _id: Random.id(), description: '', amount: 0 });
                      this.setState({ taxItems });
                    }}
                  >
                    <i className="fa fa-plus" /> Add Item
                  </Button>
                </Col>
                <Col xs={6}>
                  <p className="TaxTotal">
                    <strong>Total Tax</strong>
                    <span>{this.calculateTaxAmt()}</span>
                  </p>
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <p className="GrandTotal">
                    <strong>Grand Total</strong>
                    <span>{this.calculateGrandTotal()}</span>
                  </p>
                </Col>
              </Row>
            </FormGroup>
            {/* tax items ends */}
            <FormGroup className="InvoiceNotes">
              <Panel>
                <ControlLabel>Notes (optional, displayed on invoice)</ControlLabel>
                <textarea
                  name="notes"
                  className="form-control"
                  defaultValue={invoice && invoice.notes}
                  ref={notes => (this.notes = notes)}
                />
              </Panel>
            </FormGroup>
            <Button disabled={this.state.lineItems.length === 0} type="submit" bsStyle="success">
              {invoice && invoice._id ? 'Save Changes' : 'Create Invoice'}
            </Button>
            {invoice && invoice._id ? <Button disabled={this.state.lineItems.length === 0} onClick={this.handleSendInvoice} bsStyle="primary">
              Send Invoice
            </Button> : ''}
          </form>
        </Col>
      </Row>
    </div>);
  }
}

InvoiceEditor.defaultProps = {
  invoice: null,
};

InvoiceEditor.propTypes = {
  invoice: PropTypes.object,
  history: PropTypes.object.isRequired,
};

export default InvoiceEditor;

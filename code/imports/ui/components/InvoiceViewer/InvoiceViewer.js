import React from 'react';

class InvoiceViewer extends React.Component {
    render() {
        const { invoice } = this.props;
        return (
            <div className="InvoicesViewer">
              <div>Status: {invoice.status}
              </div>
              <div>Created: {invoice.createdAt}
              </div>
              <div>Client: {invoice.client}
              </div>
              <div>Subject: {invoice.subject}
              </div>
              <div>Total: {invoice.total}
              </div>
            </div>
        );
    }
}

export default InvoiceViewer;
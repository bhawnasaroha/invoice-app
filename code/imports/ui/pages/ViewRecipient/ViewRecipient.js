import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import Recipients from '../../../api/Recipients/Recipients';
import RecipientViewer from '../../components/RecipientViewer/RecipientViewer';
import Loading from '../../components/Loading/Loading';

const ViewRecipient = ({ loading, recipient, history }) => (!loading ? (
  <div className="ViewRecipient">
    <Row>
      <Col xs={12} sm={6} smOffset={3}>
        <h4 className="page-header">Recipient {`"${recipient.name}"`}</h4>
        <RecipientViewer recipient={recipient} history={history} />
      </Col>
    </Row>
  </div>
) : <Loading />);

export default createContainer(({ match }) => {
  const recipientId = match.params._id;
  const subscription = Meteor.subscribe('recipients.view', recipientId);
  return {
    loading: !subscription.ready(),
    recipient: Recipients.findOne(recipientId),
  };
}, ViewRecipient);

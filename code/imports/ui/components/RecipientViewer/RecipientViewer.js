import React from 'react';
import { Meteor } from 'meteor/meteor';
import Recipients from '../../../api/Recipients/Recipients';
import { Bert } from 'meteor/themeteorchef:bert';
import RecipientsCollection from '../../../api/Recipients/Recipients';

class RecipientViewer extends React.Component {
    render() {
        const { recipient } = this.props;                 
        return (
            <div className="RecipientsViewer">
                <div>Name: 
                    {recipient.name}                  
                </div>
                <div>Address:
                    {recipient.mailingAddress}                
                </div>
                <div>Contact:
                    {recipient.contacts[0].emailAddress}              
                </div>
            </div>
        );
    }
}

export default RecipientViewer;
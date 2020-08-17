/*eslint-disable*/

import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51HGktZJz00BkEY36ruq9ICZeu4KN2aHpWdBoKqdRt7boqizesxttX7yTSTKyniKJgVAEkyvTGD17zvLWgzHBHOlX000pAtFTnc'
);

export const bookTour = async tourId => {
  try {
    //1.get checkout session from api

    const session = await axios(
      `http://localhost:8000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);
    //2.create checkout form + charge the card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};

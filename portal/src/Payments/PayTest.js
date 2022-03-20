import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,

} from "@stripe/react-stripe-js";
import CardsAndPayments from './CardsAndPayments';
import { stripePublicKey } from '../config';

const ELEMENTS_OPTIONS = {
  fonts: [
    {
      cssSrc: "https://fonts.googleapis.com/css?family=Roboto"
    }
  ]
};

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(stripePublicKey);

const PayTest = (props) => {
  const { currentUser, customerData } = props;

  return (
    <Elements stripe={stripePromise} options={ELEMENTS_OPTIONS}>
      <CardsAndPayments customerData={customerData} currentUser={currentUser} />
    </Elements>
  );
};

export default PayTest;

import React, { useState, useEffect } from "react";
import {
    useStripe,
    useElements,
    CardElement,

} from "@stripe/react-stripe-js";
import firebase from 'firebase';
import { formatAmount, formatAmountForStripe } from './PayUtils';

const PayTestCards = (props) => {
    const { currentUser, customerData } = props;
    const stripe = useStripe();
    const elements = useElements();

    const [msg, setMessage] = useState('');
    const [paymentMethods, setPaymentMethods] = useState(null);
    const [payments, setPayments] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null);

    const [addNewOpen, setAddNewOpen] = useState(false);
    const [uiFrozon, setUiFrozon] = useState(false);
    const [cardholderName, setCardholderName] = useState('');
    const [amount, setAmount] = useState(100);
    const [currency, setCurreency] = useState('USD');

    const getPaymentDescription = (payment) => {
        console.info(payment);
        let content = '';
        if (
            payment.status === 'new' ||
            payment.status === 'requires_confirmation'
        ) {
            content = `Creating Payment for ${formatAmount(
                payment.amount,
                payment.currency
            )}`;
        } else if (payment.status === 'succeeded') {
            const card = payment.charges.data[0].payment_method_details.card;
            content = `✅ Payment for ${formatAmount(
                payment.amount,
                payment.currency
            )} on ${card.brand} card •••• ${card.last4}.`;
        } else if (payment.status === 'requires_action') {
            content = `🚨 Payment for ${formatAmount(
                payment.amount,
                payment.currency
            )} ${payment.status}`;
        } else {
            content = `⚠️ Payment for ${formatAmount(
                payment.amount,
                payment.currency
            )} ${payment.status}`;
        }
        return content;
    }
    const cardElementChange = ({ error }) => {
        setMessage(error ? error.message : '');
    }

    // Add card form event handling..
    const addCard = async (event) => {
        event.preventDefault();
        if (!event.target.reportValidity()) {
            return;
        }
        setUiFrozon(true);
        const cardElement = elements.getElement(CardElement);
        const { setupIntent, error } = await stripe.confirmCardSetup(
            customerData.setup_secret,
            {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: cardholderName,
                    },
                },
            }
        );

        if (error) {
            setMessage(error.message);
            setUiFrozon(false);
            return;
        }

        await firebase
            .firestore()
            .collection('stripe_customers')
            .doc(currentUser.uid)
            .collection('payment_methods')
            .add({ id: setupIntent.payment_method });

        setAddNewOpen(false);
        setUiFrozon(false);
    }


    const addPayment = async (event) => {
        event.preventDefault();
        setUiFrozon(true);
        const data = {
            payment_method: paymentMethod,
            currency,
            amount: formatAmountForStripe(amount, currency),
            status: 'new',
        };

        await firebase
            .firestore()
            .collection('stripe_customers')
            .doc(currentUser.uid)
            .collection('payments')
            .add(data);

        setUiFrozon(false);
    }


    /**
   * Set up Firestore data listeners
   */
    const startDataListeners = function () {
        /**
         * Get all payment methods for the logged in customer
         */
        firebase
            .firestore()
            .collection('stripe_customers')
            .doc(currentUser.uid)
            .collection('payment_methods')
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    setAddNewOpen(true);
                } else {
                    setPaymentMethod(snapshot.docs[0].data().id);
                    setPaymentMethods(snapshot.docs);
                }

            });

        /**
         * Get all payments for the logged in customer
         */
        firebase
            .firestore()
            .collection('stripe_customers')
            .doc(currentUser.uid)
            .collection('payments')
            .onSnapshot((snapshot) => {
                setPayments(snapshot.docs);
                snapshot.forEach((doc) => {
                    const payment = doc.data();
                    if (payment.status === 'requires_action') {
                        handleCardAction(payment, doc.id);
                    }
                });
            });
    }


    // Handle card actions like 3D Secure
    const handleCardAction = async function (payment, docId) {
        const { error, paymentIntent } = await stripe.handleCardAction(
            payment.client_secret
        );
        if (error) {
            alert(error.message);
            payment = error.payment_intent;
        } else if (paymentIntent) {
            payment = paymentIntent;
        }

        await firebase
            .firestore()
            .collection('stripe_customers')
            .doc(currentUser.uid)
            .collection('payments')
            .doc(docId)
            .set(payment, { merge: true });
    }


    useEffect(() => {
        startDataListeners();
    }, []);
    return (
        <>
            {msg !== '' && (<div style={{ border: 'solid 1px #f00', padding: 10, }}>{msg}</div>)}

            <div>
                <h2>Payment Methods</h2>
                <details open={addNewOpen}>
                    <summary>Add new</summary>
                    <p>
                        Use any of the
            <a href="https://stripe.com/docs/testing#international-cards" target="_blank"
                        >Stripe test cards</a
                        >
            for this demo!
          </p>
                    <form id="payment-method-form" onSubmit={addCard}>
                        <label>
                            Cardholder name
              <input type="text" name="name" onChange={e => setCardholderName(e.target.value)} required />
                        </label>
                        <fieldset>
                            <CardElement onChange={cardElementChange} />
                        </fieldset>
                        <div id="error-message" role="alert"></div>
                        <button disabled={uiFrozon}>Save Card</button>
                    </form>
                </details>
                <hr />
                <form id="payment-form" onSubmit={addPayment}>
                    <div>
                        <label>
                            Card:
                {paymentMethods && (<select name="payment-method" required onChange={e => setPaymentMethod(e.target.value)}>
                                {paymentMethods.map((_p) => {
                                    const p = _p.data();
                                    return (<>
                                        {p.card && (
                                            <option value={p.id} selected={p.id === paymentMethod}>
                                                {`${p.card.brand} •••• ${p.card.last4} | Expires ${p.card.exp_month}/${p.card.exp_year}`}
                                            </option>
                                        )}
                                    </>);
                                })}

                            </select>)}
                        </label>
                    </div>
                    <div>
                        <label>
                            Amount:
              <input
                                name="amount"
                                type="number"
                                min="1"
                                max="99999999"
                                value={amount}
                                required
                                onChange={e => setAmount(e.target.value)}
                            />
                        </label>
                        <label>
                            Currency:
                            <select name="currency" onChange={e => setCurreency(e.target.value)}>
                                {['usd', 'eur', 'gbp', 'jpy'].map((c) => (
                                    <option value={c} selected={c === currency}>{c}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <button>Charge selected card</button>
                </form>
                <div>
                    <h2>Payments</h2>
                    {payments && (<ul>
                        {payments.map(_p => {
                            const p = _p.data();
                            return(<li>
                            {getPaymentDescription(p)}
                        </li>)}
                        )}
                    </ul>)}
                </div>
            </div>
        </>
    )
}

export default PayTestCards;
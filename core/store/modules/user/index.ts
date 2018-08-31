import { Module } from 'vuex'
import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import EventBus from '../../lib/event-bus'
import i18n from '@vue-storefront/i18n'
import rootStore from '../../'
import RootState from '../../types/RootState'
import UserState from './types/UserState'

EventBus.$on('user-after-update', (event) => {
  if (event.resultCode === 200) {
    EventBus.$emit('notification', {
      type: 'success',
      message: i18n.t('Account data has successfully been updated'),
      action1: { label: i18n.t('OK'), action: 'close' }
    })
    rootStore.dispatch('user/refreshCurrentUser', event.result)
  }
})

EventBus.$on('session-after-authorized', (event) => { // example stock check callback
  console.log('Loading user profile')
  rootStore.dispatch('user/me', { refresh: navigator.onLine }, { root: true }).then((us) => {}) // this will load user cart
  rootStore.dispatch('user/getOrdersHistory', { refresh: navigator.onLine }, { root: true }).then((us) => {})
})

// After order has been placed fill in missing address information in user's profile and update orders history
EventBus.$on('order-after-placed', (order) => {
  if (rootStore.getters['user/isLoggedIn']) {
    let currentUser = rootStore.state.user.current
    let hasShippingAddress = currentUser.hasOwnProperty('default_shipping')
    let hasBillingAddress = currentUser.hasOwnProperty('default_billing')
    if (!(hasShippingAddress && hasBillingAddress)) {
      let customer = Object.assign({}, currentUser)
      if (!hasShippingAddress) {
        let shippingAddress = order.order.addressInformation.shippingAddress
        customer.addresses.push({
          firstname: shippingAddress.firstname,
          lastname: shippingAddress.lastname,
          street: [shippingAddress.street[0], shippingAddress.street[1]],
          city: shippingAddress.city,
          ...(shippingAddress.region ? { region: { region: shippingAddress.region } } : {}),
          country_id: shippingAddress.country_id,
          postcode: shippingAddress.postcode,
          ...(shippingAddress.telephone ? { telephone: shippingAddress.telephone } : {}),
          default_shipping: true
        })
      }
      if (!hasBillingAddress) {
        let billingAddress = order.order.addressInformation.billingAddress
        let hasCompany = billingAddress.company
        if (hasCompany) {
          customer.addresses.push({
            firstname: billingAddress.firstname,
            lastname: billingAddress.lastname,
            street: [billingAddress.street[0], billingAddress.street[1]],
            city: billingAddress.city,
            ...(billingAddress.region ? { region: { region: billingAddress.region } } : {}),
            country_id: billingAddress.country_id,
            postcode: billingAddress.postcode,
            company: billingAddress.company,
            vat_id: billingAddress.vat_id,
            default_billing: true
          })
        }
      }

      rootStore.dispatch('user/update', { customer: customer })
    }
    rootStore.dispatch('user/getOrdersHistory', { refresh: true, useCache: false }).then(result => {})
  }
})

const user: Module<UserState, RootState> = {
  namespaced: true,
  state: {
    token: '',
    refreshToken: '',
    groupToken: '',
    groupId: null,
    current: null,
    current_storecode: '',
    session_started: new Date(),
    newsletter: null,
    orders_history: null
  },
  getters,
  actions,
  mutations
}

export default user
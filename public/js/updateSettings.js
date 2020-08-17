/*eslint-disable*/
import axios from 'axios';
import { showAlert } from './alerts';

// type is either password or data
exports.updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? 'http://localhost:8000/api/v1/users/updateMyPassword'
        : 'http://localhost:8000/api/v1/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url,
      data
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} Updated successfully!`);
    }

    // res.status(200).render('account', {
    //   title: `Your Account`,
    //   user: updatedUser
    // });
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

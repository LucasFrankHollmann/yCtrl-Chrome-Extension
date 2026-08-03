import ReactDOM from 'react-dom/client'
import Popup from './Popup'

const container = document.getElementById('root')
if(!container)
  throw new Error('#root is missing from popup.html')

const root = ReactDOM.createRoot(container)
root.render(<Popup />)

import Header from '../components/Header'
import LeftPane from '../components/LeftPane'
import MainPane from '../components/MainPane'
import styles from './page.module.css'

export default function MineLayout({ children }) {
  return (
    <div className="container">
      <Header />
      <div className={styles.layout}>
        <LeftPane />
        <MainPane>
          {children}
        </MainPane>
      </div>
    </div>
  )
}

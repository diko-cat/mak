import { AboutSection, ContactsSection, DoctorsSection, ServicesSection } from './sections'
import { usePublicData } from './usePublicData'

export function AboutPage() {
  const { clinic } = usePublicData()
  return <main className="public-page"><AboutSection clinic={clinic} page /></main>
}

export function ServicesPage() {
  const { services } = usePublicData()
  return <main className="public-page"><ServicesSection services={services} page /></main>
}

export function DoctorsPage() {
  const { doctors } = usePublicData()
  return <main className="public-page"><DoctorsSection doctors={doctors} page /></main>
}

export function ContactsPage() {
  const { clinic } = usePublicData()
  return <main className="public-page"><ContactsSection clinic={clinic} page /></main>
}

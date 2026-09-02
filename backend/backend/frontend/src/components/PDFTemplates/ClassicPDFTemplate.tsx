import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Invoice, BusinessProfile } from '../../types';

const pageStyle = {
  padding: 30,
  fontSize: 9,
  fontFamily: 'Helvetica',
  color: '#0f172a',
  backgroundColor: '#ffffff'
};

const headerStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  marginBottom: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#e2e8f0',
  paddingBottom: 15
};

const titleStyle = {
  fontSize: 20,
  fontFamily: 'Helvetica-Bold',
  color: '#0284c7',
  textTransform: 'uppercase' as const
};

const subtitleStyle = {
  fontSize: 9,
  color: '#64748b',
  marginTop: 4
};

const logoStyle = {
  width: 100,
  height: 45
};

const rowStyle = {
  flexDirection: 'row' as const
};

const col2Style = {
  width: '50%'
};

const sectionTitleStyle = {
  fontSize: 10,
  fontFamily: 'Helvetica-Bold',
  color: '#334155',
  marginBottom: 6,
  textTransform: 'uppercase' as const
};

const textBoldStyle = {
  fontFamily: 'Helvetica-Bold'
};

const metaTextStyle = {
  fontSize: 8.5,
  color: '#475569',
  marginBottom: 3
};

const tableStyle = {
  width: '100%',
  marginTop: 15,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 4
};

const tableHeaderStyle = {
  flexDirection: 'row' as const,
  backgroundColor: '#0f172a',
  padding: 6,
  color: '#ffffff'
};

const tableHeaderCellStyle = {
  fontSize: 8,
  fontFamily: 'Helvetica-Bold',
  textTransform: 'uppercase' as const
};

const tableRowStyle = {
  flexDirection: 'row' as const,
  borderBottomWidth: 1,
  borderBottomColor: '#f1f5f9',
  padding: 6,
  alignItems: 'center' as const
};

const tableCellStyle = {
  fontSize: 8.5,
  color: '#334155'
};

const colDescStyle = { width: '45%' };
const colHsnStyle = { width: '15%', textAlign: 'center' as const };
const colQtyStyle = { width: '12%', textAlign: 'center' as const };
const colRateStyle = { width: '14%', textAlign: 'right' as const };
const colAmtStyle = { width: '14%', textAlign: 'right' as const };

const summaryBoxStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'flex-end' as const,
  marginTop: 10
};

const summaryTableStyle = {
  width: '45%'
};

const summaryRowStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  paddingVertical: 3
};

const grandTotalRowStyle = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  paddingVertical: 5,
  borderTopWidth: 1,
  borderTopColor: '#0284c7',
  marginTop: 4
};

const grandTotalTextStyle = {
  fontSize: 12,
  fontFamily: 'Helvetica-Bold',
  color: '#0284c7'
};

const footerStyle = {
  marginTop: 25,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#e2e8f0'
};

const signatureBoxStyle = {
  marginTop: 15,
  alignItems: 'flex-end' as const
};

const signatureImageStyle = {
  width: 90,
  height: 35
};

const styles = StyleSheet.create({
  page: pageStyle,
  header: headerStyle,
  title: titleStyle,
  subtitle: subtitleStyle,
  logo: logoStyle,
  row: rowStyle,
  col2: col2Style,
  sectionTitle: sectionTitleStyle,
  textBold: textBoldStyle,
  metaText: metaTextStyle,
  table: tableStyle,
  tableHeader: tableHeaderStyle,
  tableHeaderCell: tableHeaderCellStyle,
  tableRow: tableRowStyle,
  tableCell: tableCellStyle,
  colDesc: colDescStyle,
  colHsn: colHsnStyle,
  colQty: colQtyStyle,
  colRate: colRateStyle,
  colAmt: colAmtStyle,
  summaryBox: summaryBoxStyle,
  summaryTable: summaryTableStyle,
  summaryRow: summaryRowStyle,
  grandTotalRow: grandTotalRowStyle,
  grandTotalText: grandTotalTextStyle,
  footer: footerStyle,
  signatureBox: signatureBoxStyle,
  signatureImage: signatureImageStyle
});

interface PDFProps {
  invoice: Invoice;
  profile?: BusinessProfile;
  logo?: string | null;
  signature?: string | null;
}

export const ClassicPDFTemplate: React.FC<PDFProps> = ({ invoice, profile, logo, signature }) => {
  const sym = profile?.currency === 'INR' ? 'Rs.' : (profile?.currency === 'GBP' ? 'GBP ' : '$');
  const items = invoice.items || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{invoice.invoiceType?.replace(/_/g, ' ') || 'TAX INVOICE'}</Text>
            <Text style={styles.subtitle}>#{invoice.invoiceNumber}</Text>
          </View>
          {logo ? (
            <Image src={logo} style={styles.logo} />
          ) : (
            <View>
              <Text style={[styles.textBold, { fontSize: 14 }]}>{profile?.name || 'MY BUSINESS'}</Text>
            </View>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.col2}>
            <Text style={styles.sectionTitle}>Billed To:</Text>
            <Text style={[styles.metaText, styles.textBold]}>{invoice.clientName || 'Client'}</Text>
            {Boolean(invoice.clientAddress) && <Text style={styles.metaText}>{invoice.clientAddress}</Text>}
            {Boolean(invoice.clientPhone) && <Text style={styles.metaText}>Tel: {invoice.clientPhone}</Text>}
            {Boolean(invoice.clientGstin) && <Text style={styles.metaText}>GSTIN: {invoice.clientGstin}</Text>}
          </View>
          <View style={styles.col2}>
            <Text style={styles.sectionTitle}>Document Details:</Text>
            <Text style={styles.metaText}>Date: {invoice.date}</Text>
            <Text style={styles.metaText}>Due Date: {invoice.dueDate}</Text>
            {Boolean(invoice.poNumber) && <Text style={styles.metaText}>P.O. No: {invoice.poNumber}</Text>}
            {Boolean(invoice.deliveryNote) && <Text style={styles.metaText}>Delivery Note: {invoice.deliveryNote}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Item Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colHsn]}>HSN</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmt]}>Amount</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDesc, styles.textBold]}>{item.name}</Text>
              <Text style={[styles.tableCell, styles.colHsn]}>{(item as any).hsn || (item as any).hsnSac || '-'}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.colRate]}>{sym}{item.rate.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.colAmt, styles.textBold]}>{sym}{(item.quantity * item.rate).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.metaText}>Subtotal:</Text>
              <Text style={[styles.metaText, styles.textBold]}>{sym}{(invoice.subtotal || 0).toFixed(2)}</Text>
            </View>
            {Boolean(invoice.discountTotal) && (
              <View style={styles.summaryRow}>
                <Text style={styles.metaText}>Discount:</Text>
                <Text style={styles.metaText}>-{sym}{(invoice.discountTotal || 0).toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.metaText}>Tax Total:</Text>
              <Text style={[styles.metaText, styles.textBold]}>{sym}{(invoice.taxTotal || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalText}>Grand Total:</Text>
              <Text style={styles.grandTotalText}>{sym}{(invoice.grandTotal || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {Boolean(invoice.notes) && (
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Notes / Terms:</Text>
              <Text style={styles.metaText}>{invoice.notes}</Text>
            </View>
          )}

          {signature && (
            <View style={styles.signatureBox}>
              <Image src={signature} style={styles.signatureImage} />
              <Text style={[styles.metaText, { marginTop: 4 }]}>Authorized Signatory</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

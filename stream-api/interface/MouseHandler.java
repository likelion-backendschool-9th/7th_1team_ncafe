import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.JFrame;
import javax.swing.JOptionPane;

public class MouseHandler extends MouseAdapter {

    private JFrame parent;

    public MouseHandler(JFrame parent) {
        this.parent = parent;
    }

    @Override
    public void mouseClicked(MouseEvent e) {
        System.out.println("haha");
        JOptionPane.showMessageDialog(parent, "haha");
    }
    
}
